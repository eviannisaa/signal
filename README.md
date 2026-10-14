# Signal

Aplikasi untuk belajar dan bermain sandi Morse, dengan tampilan bergaya perangkat radio. Tersedia dalam Bahasa Indonesia dan English.

## Fitur

**Publik (tanpa akun)**

- **Tantangan Morse**: buat room, bagikan link, lalu adu score dan kecepatan dengan teman di leaderboard.
- **Kirim Pesan Morse**: kirim pesan dalam sinyal pilihan dan tebak pesan dari pemain lain.
- **Morse Translator**: terjemahkan teks ke Morse dan sebaliknya, lengkap dengan waveform dan bunyi.
- **Morse Explorer**: lihat setiap huruf A–Z dalam lima representasi: bunyi, cahaya, bendera, kedipan mata, dan cermin.

**Area belajar (perlu akun email dan password)**

- **Lesson**: materi bertahap dengan tabel karakter.
- **Practice**: latihan encode dan decode dengan koreksi langsung.
- **Listening**: tebak isi sinyal bunyi atau cahaya dengan kecepatan yang dapat diatur.
- **Telegraf**: kirim dengan kunci telegraf, atau terima telegram dari sounder.
- **Quiz**: soal terkurasi, dengan koreksi per soal dan score terbaik yang tersimpan.
- **Progress**: ringkasan lesson yang selesai, score quiz, dan riwayat attempt.
- **Pengaturan akun**: ubah nama, foto profil, password, dan bahasa.

## Teknologi

- [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, Server Functions) dan TanStack Query
- PostgreSQL dengan [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com) untuk login email dan password
- Tailwind CSS 4 dan komponen [shadcn/ui](https://ui.shadcn.com)
- Vitest, ESLint, dan Prettier

## Menjalankan di lokal

Kebutuhan: Node.js 22, pnpm 10, dan Docker (untuk PostgreSQL).

1. Install dependency:

   ```bash
   pnpm install
   ```

2. Salin konfigurasi environment, lalu isi `BETTER_AUTH_SECRET`:

   ```bash
   cp .env.example .env.local
   openssl rand -base64 32   # tempel hasilnya ke BETTER_AUTH_SECRET
   ```

3. Jalankan PostgreSQL (port `5544`):

   ```bash
   docker compose up -d
   ```

4. Buat tabel dan isi data lesson serta quiz:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Jalankan aplikasi di http://localhost:3000:

   ```bash
   pnpm dev
   ```

## Environment

| Variabel             | Keterangan                                                                       |
| -------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Koneksi PostgreSQL aplikasi.                                                     |
| `TEST_DATABASE_URL`  | Database khusus integration test. Jangan diisi database staging atau production. |
| `BETTER_AUTH_URL`    | URL dasar aplikasi, misalnya `http://localhost:3000`.                            |
| `BETTER_AUTH_SECRET` | Secret untuk session. Buat dengan `openssl rand -base64 32`.                     |

Nilai dibaca dari `.env.local` atau `.env`. Keduanya tidak di-commit.

## Script

| Perintah           | Fungsi                                                           |
| ------------------ | ---------------------------------------------------------------- |
| `pnpm dev`         | Menjalankan dev server di port 3000.                             |
| `pnpm build`       | Build untuk production.                                          |
| `pnpm preview`     | Menjalankan hasil build.                                         |
| `pnpm test`        | Menjalankan semua test (Vitest).                                 |
| `pnpm typecheck`   | Mengecek tipe TypeScript.                                        |
| `pnpm lint`        | Menjalankan ESLint.                                              |
| `pnpm format`      | Merapikan kode dengan Prettier dan ESLint.                       |
| `pnpm db:generate` | Membuat migration baru dari perubahan `src/db/schema.ts`.        |
| `pnpm db:migrate`  | Menjalankan migration yang belum diterapkan.                     |
| `pnpm db:seed`     | Mengisi atau memperbarui lesson dan quiz. Aman dijalankan ulang. |
| `pnpm db:studio`   | Membuka Drizzle Studio.                                          |

## Struktur folder

```
src/
  routes/        Halaman (file-based routing). Area belajar ada di routes/_authed/
  features/      Kode per fitur: komponen, Server Function, dan messages.ts
  components/    Komponen bersama: kerangka aplikasi (radio/), tampilan Morse (morse/), dan shadcn (ui/)
  lib/           Logic Morse, audio, auth, dan i18n
  db/            Schema Drizzle, seed, dan script pemeliharaan
drizzle/         File migration SQL
docs/            Dokumentasi arsitektur
```

## Dua bahasa (ID dan EN)

- Pilihan bahasa disimpan di cookie `signal-locale`. Tanpa cookie, browser berbahasa Inggris mendapat English; selain itu Bahasa Indonesia.
- Teks antarmuka ada di `messages.ts` per fitur, ditulis dengan `defineMessages({ id, en })`. TypeScript memastikan setiap kunci di `id` juga ada di `en`.
- Di komponen, pakai `const t = useT(fiturMessages)`. Di Server Function, pakai `readLocale()` dari `#/lib/i18n/server`.
- Konten lesson dan quiz versi English disimpan di kolom `title_en` dan `description_en`, dan diisi oleh `pnpm db:seed`.

## Pemeliharaan

Game yang tidak aktif lebih dari 30 hari dapat dihapus dengan script berikut. Buat backup database terlebih dulu.

```bash
pnpm tsx src/db/cleanup-games.ts --dry-run   # hanya menampilkan jumlah game yang akan dihapus
pnpm tsx src/db/cleanup-games.ts             # menghapus game lama
```

## Dokumentasi

Arsitektur lengkap ada di `docs/architecture/index.html`, dan ringkasan kebutuhan produk ada di `project-context.md`.
