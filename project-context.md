# Project Context

## 1. Apa itu aplikasi ini?

Signal adalah aplikasi untuk belajar dan berlatih sandi Morse.

Fungsi utama:

-    Mempelajari kode Morse.
-    Berlatih encode dan decode.
-    Menerjemahkan teks dan Morse (Morse Translator).
-    Memilih huruf A–Z dan melihat representasi Morse-nya dalam 5 jenis: Audio Signal, Light Signal, Signal Timeline, Morse Chart, dan Dot & Dash Text (Morse Explorer).
-    Berlatih mendengarkan Morse (listening exercise).
-    Mengikuti quiz.
-    Melihat progress belajar.

Target pengguna adalah orang yang ingin mempelajari atau berlatih sandi Morse, terutama pemula.

## 2. Alur pengguna utama

-    Pengguna membuka aplikasi.
-    Pengguna mempelajari materi.
-    Pengguna mencoba latihan encode atau decode.
-    Pengguna mengikuti quiz.
-    Sistem memeriksa jawaban dan memberikan score.
-    Progress pengguna disimpan.

## 3. Data yang perlu disimpan

-    User (akun untuk area belajar)
-    Game, pemain game (nickname), hasil tantangan, dan pesan Morse
-    Materi pembelajaran
-    Soal quiz
-    Jawaban dan score
-    Progress belajar
-    Riwayat latihan jika diperlukan
-    Pengaturan pengguna jika diperlukan

## 4. Batasan teknis

-    TanStack Start
-    TypeScript
-    TanStack Router
-    TanStack Query jika diperlukan
-    PostgreSQL
-    Drizzle ORM
-    Dua area:
     -    Publik: landing page dengan kartu game (Tantangan Morse dan Kirim Pesan Morse). Morse Translator juga publik. Klik kartu langsung pindah ke halaman game (/g/$gameId), dan URL itu adalah link unik game. Sebelum bermain, pemain mengisi nickname di popup halaman game. Siapa pun yang membuka link bisa bergabung dengan cara yang sama selama link masih ada. Score per pemain.
     -    Login (email + password): Lesson, Practice, Listening, Quiz, dan Progress.
-    Tidak membutuhkan real-time update untuk versi awal
-    Tidak membutuhkan background job untuk versi awal

## 5. Color palette

-    Navy `#172033`
-    Blue `#2563EB`
-    Cyan `#06B6D4`
-    Off-white `#F8FAFC`
-    Aturan Morse: Cyan = dot · Blue = dash

## 6. Visual style

Radio Communication Aesthetic, terinspirasi perangkat radio dan signal transmitter. Memakai titik dan strip Morse, indikator sinyal, tampilan frekuensi, waveform, dan aksen panel radio. Dipakai di semua UI: landing page, game, Morse Translator, area belajar (Lesson, Practice, Listening, Quiz, Progress), dan halaman login.
