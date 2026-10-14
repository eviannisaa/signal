/**
 * Mengisi lesson dan quiz. Aman dijalankan ulang: data di-upsert berdasarkan slug,
 * dan soal quiz yang sudah ada tidak diubah agar riwayat attempt tetap konsisten.
 */
import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

async function main() {
  const { db } = await import('./index')
  const { lessons, quizzes, questions } = await import('./schema')
  const { lessonsSeed } = await import('./seed/lessons')
  const { quizzesSeed } = await import('./seed/quizzes')
  const { eq } = await import('drizzle-orm')

  for (const l of lessonsSeed) {
    await db
      .insert(lessons)
      .values(l)
      .onConflictDoUpdate({ target: lessons.slug, set: { title: l.title, titleEn: l.titleEn, position: l.position, description: l.description, descriptionEn: l.descriptionEn, characters: l.characters } })
  }

  for (const q of quizzesSeed) {
    const lesson = q.lessonSlug ? await db.query.lessons.findFirst({ where: eq(lessons.slug, q.lessonSlug) }) : undefined
    const [quiz] = await db
      .insert(quizzes)
      .values({ slug: q.slug, title: q.title, titleEn: q.titleEn, lessonId: lesson?.id ?? null })
      .onConflictDoUpdate({ target: quizzes.slug, set: { title: q.title, titleEn: q.titleEn, lessonId: lesson?.id ?? null } })
      .returning()
    const existing = await db.query.questions.findMany({ where: eq(questions.quizId, quiz.id) })
    if (existing.length === 0) {
      await db.insert(questions).values(q.questions.map((item, i) => ({ quizId: quiz.id, type: item.type, prompt: item.prompt, answer: item.answer, position: i + 1 })))
    }
  }

  console.log(`Seed selesai: ${lessonsSeed.length} lesson, ${quizzesSeed.length} quiz.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
