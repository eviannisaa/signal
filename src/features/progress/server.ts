import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, max } from 'drizzle-orm'

import { db } from '#/db'
import { lessonProgress, lessons, questions, quizAttempts, quizzes } from '#/db/schema'
import { requireUser } from '#/features/auth/server'
import { readLocale } from '#/lib/i18n/server'

export interface ProgressSummary {
  lessons: {
    completed: number
    total: number
    items: { slug: string; title: string; position: number; completedAt: string | null }[]
  }
  quizzes: { slug: string; title: string; bestScore: number | null; total: number; attemptCount: number }[]
  recentAttempts: { id: string; quizSlug: string; quizTitle: string; score: number; total: number; createdAt: string }[]
}

/** Ringkasan progress dari lesson_progress dan quiz_attempts, tanpa tabel tambahan. */
export const getProgress = createServerFn({ method: 'GET' }).handler(async (): Promise<ProgressSummary> => {
  const user = await requireUser()
  const en = readLocale() === 'en'
  const [lessonRows, done, quizRows, counts, bests, recent] = await Promise.all([
    db.select({ id: lessons.id, slug: lessons.slug, title: lessons.title, titleEn: lessons.titleEn, position: lessons.position }).from(lessons).orderBy(asc(lessons.position)),
    db.select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt }).from(lessonProgress).where(eq(lessonProgress.userId, user.id)),
    db.select({ id: quizzes.id, slug: quizzes.slug, title: quizzes.title, titleEn: quizzes.titleEn, lessonPosition: lessons.position }).from(quizzes).leftJoin(lessons, eq(lessons.id, quizzes.lessonId)),
    db.select({ quizId: questions.quizId, n: count() }).from(questions).groupBy(questions.quizId),
    db
      .select({ quizId: quizAttempts.quizId, best: max(quizAttempts.score), n: count() })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, user.id))
      .groupBy(quizAttempts.quizId),
    db
      .select({ id: quizAttempts.id, quizSlug: quizzes.slug, quizTitle: quizzes.title, quizTitleEn: quizzes.titleEn, score: quizAttempts.score, total: quizAttempts.total, createdAt: quizAttempts.createdAt })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(eq(quizAttempts.userId, user.id))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(10),
  ])

  const doneMap = new Map(done.map((d) => [d.lessonId, d.completedAt]))
  const countMap = new Map(counts.map((c) => [c.quizId, c.n]))
  const bestMap = new Map(bests.map((b) => [b.quizId, b]))
  const items = lessonRows.map((l) => ({ slug: l.slug, title: en ? (l.titleEn ?? l.title) : l.title, position: l.position, completedAt: doneMap.get(l.id)?.toISOString() ?? null }))

  return {
    lessons: { completed: items.filter((i) => i.completedAt).length, total: items.length, items },
    quizzes: quizRows
      .sort((a, b) => (a.lessonPosition ?? Number.MAX_SAFE_INTEGER) - (b.lessonPosition ?? Number.MAX_SAFE_INTEGER) || a.id - b.id)
      .map((q) => ({
        slug: q.slug,
        title: en ? (q.titleEn ?? q.title) : q.title,
        bestScore: bestMap.get(q.id)?.best ?? null,
        total: countMap.get(q.id) ?? 0,
        attemptCount: bestMap.get(q.id)?.n ?? 0,
      })),
    recentAttempts: recent.map(({ quizTitleEn, ...r }) => ({ ...r, quizTitle: en ? (quizTitleEn ?? r.quizTitle) : r.quizTitle, createdAt: r.createdAt.toISOString() })),
  }
})
