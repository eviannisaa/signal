/**
 * Menghapus game yang tidak aktif lebih dari 30 hari berdasarkan games.last_played_at.
 * Data turunan (game_players, challenge_rounds, challenge_results, messages,
 * message_guesses) ikut terhapus melalui foreign key cascade.
 *
 * Cara aman: buat backup database terlebih dahulu, jalankan dry run, lalu hapus.
 *
 *   pnpm tsx src/db/cleanup-games.ts --dry-run   # hanya menampilkan jumlah game yang akan dihapus
 *   pnpm tsx src/db/cleanup-games.ts             # menghapus game lama
 *
 * DATABASE_URL dibaca dari .env.local atau .env (atau environment shell).
 */
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const MAX_AGE_DAYS = 30

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { db } = await import('./index')
  const { games } = await import('./schema')
  const { count, lt } = await import('drizzle-orm')

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
  const where = lt(games.lastPlayedAt, cutoff)

  const [{ n }] = await db.select({ n: count() }).from(games).where(where)
  console.log(`Game dengan last_played_at sebelum ${cutoff.toISOString()}: ${n}`)

  if (dryRun) {
    console.log('Dry run: tidak ada data yang dihapus.')
  } else if (n > 0) {
    const deleted = await db.delete(games).where(where).returning({ id: games.id })
    console.log(`${deleted.length} game dihapus.`)
  }

  await db.$client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
