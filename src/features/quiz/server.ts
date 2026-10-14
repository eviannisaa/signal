import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { and, asc, count, eq, max } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { attemptAnswers, lessons, questions, quizAttempts, quizzes } from '#/db/schema'
import { requireUser } from '#/features/auth/server'
import { readLocale } from '#/lib/i18n/server'
import { gradeQuiz } from './grade'
import { quizMessages } from './messages'

const SLUG_RE = /^[a-z0-9-]{1,64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface QuizListItem {
  id: number
  slug: string
  title: string
  lesson: { slug: string; title: string } | null
  questionCount: number
  bestScore: number | null
  attemptCount: number
}

/** Daftar quiz beserta jumlah soal dan score terbaik pengguna. */
export const getQuizzes = createServerFn({ method: 'GET' }).handler(async (): Promise<QuizListItem[]> => {
  const user = await requireUser()
  const en = readLocale() === 'en'
  const [rows, counts, bests] = await Promise.all([
    db
      .select({ id: quizzes.id, slug: quizzes.slug, title: quizzes.title, titleEn: quizzes.titleEn, lessonSlug: lessons.slug, lessonTitle: lessons.title, lessonTitleEn: lessons.titleEn, lessonPosition: lessons.position })
      .from(quizzes)
      .leftJoin(lessons, eq(lessons.id, quizzes.lessonId))
      .orderBy(asc(quizzes.id)),
    db.select({ quizId: questions.quizId, n: count() }).from(questions).groupBy(questions.quizId),
    db
      .select({ quizId: quizAttempts.quizId, best: max(quizAttempts.score), n: count() })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, user.id))
      .groupBy(quizAttempts.quizId),
  ])
  const countMap = new Map(counts.map((c) => [c.quizId, c.n]))
  const bestMap = new Map(bests.map((b) => [b.quizId, b]))
  return rows
    .sort((a, b) => (a.lessonPosition ?? Number.MAX_SAFE_INTEGER) - (b.lessonPosition ?? Number.MAX_SAFE_INTEGER) || a.id - b.id)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: en ? (r.titleEn ?? r.title) : r.title,
      lesson: r.lessonSlug && r.lessonTitle ? { slug: r.lessonSlug, title: en ? (r.lessonTitleEn ?? r.lessonTitle) : r.lessonTitle } : null,
      questionCount: countMap.get(r.id) ?? 0,
      bestScore: bestMap.get(r.id)?.best ?? null,
      attemptCount: bestMap.get(r.id)?.n ?? 0,
    }))
})

export interface QuizForAttempt {
  id: number
  slug: string
  title: string
  questions: { id: number; type: 'encode' | 'decode'; prompt: string; position: number }[]
}

/** Soal untuk dikerjakan, TANPA kunci jawaban. */
export const getQuizForAttempt = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ slug: z.string().max(100) }))
  .handler(async ({ data }): Promise<QuizForAttempt> => {
    await requireUser()
    if (!SLUG_RE.test(data.slug)) throw notFound()
    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.slug, data.slug) })
    if (!quiz) throw notFound()
    const qs = await db
      .select({ id: questions.id, type: questions.type, prompt: questions.prompt, position: questions.position })
      .from(questions)
      .where(eq(questions.quizId, quiz.id))
      .orderBy(asc(questions.position))
    if (qs.length === 0) throw notFound()
    return { id: quiz.id, slug: quiz.slug, title: readLocale() === 'en' ? (quiz.titleEn ?? quiz.title) : quiz.title, questions: qs }
  })

const submitSchema = z.object({
  slug: z.string().regex(SLUG_RE),
  answers: z
    .array(z.object({ questionId: z.number().int().positive(), answer: z.string().max(200) }))
    .max(100)
    .refine((list) => new Set(list.map((a) => a.questionId)).size === list.length, 'Jawaban ganda untuk soal yang sama.'),
})

/** Menilai jawaban di server lalu menyimpan attempt baru dalam satu transaksi. */
export const submitQuiz = createServerFn({ method: 'POST' })
  .inputValidator(submitSchema)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const errors = quizMessages[readLocale()].errors
    const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.slug, data.slug) })
    if (!quiz) throw new Error(errors.notFound)
    const keys = await db
      .select({ id: questions.id, type: questions.type, answer: questions.answer })
      .from(questions)
      .where(eq(questions.quizId, quiz.id))
      .orderBy(asc(questions.position))
    if (keys.length === 0) throw new Error(errors.noQuestions)
    const validIds = new Set(keys.map((k) => k.id))
    if (data.answers.some((a) => !validIds.has(a.questionId))) throw new Error(errors.foreignQuestion)

    const graded = gradeQuiz(keys, data.answers)
    const attemptId = await db.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(quizAttempts)
        .values({ userId: user.id, quizId: quiz.id, score: graded.score, total: graded.total })
        .returning({ id: quizAttempts.id })
      await tx.insert(attemptAnswers).values(graded.results.map((r) => ({ attemptId: attempt.id, questionId: r.questionId, answer: r.answer, isCorrect: r.isCorrect })))
      return attempt.id
    })
    return { attemptId, score: graded.score, total: graded.total }
  })

export interface AttemptResult {
  id: string
  quiz: { slug: string; title: string }
  score: number
  total: number
  createdAt: string
  results: { questionId: number; position: number; type: 'encode' | 'decode'; prompt: string; answer: string; correctAnswer: string; isCorrect: boolean }[]
}

/** Hasil satu attempt. Hanya pemilik yang dapat membacanya; selain itu 404. */
export const getAttempt = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ attemptId: z.string().max(64) }))
  .handler(async ({ data }): Promise<AttemptResult> => {
    const user = await requireUser()
    if (!UUID_RE.test(data.attemptId)) throw notFound()
    const attempt = (await db
      .select({ id: quizAttempts.id, score: quizAttempts.score, total: quizAttempts.total, createdAt: quizAttempts.createdAt, slug: quizzes.slug, title: quizzes.title, titleEn: quizzes.titleEn })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(and(eq(quizAttempts.id, data.attemptId), eq(quizAttempts.userId, user.id)))).at(0)
    if (!attempt) throw notFound()
    const results = await db
      .select({
        questionId: questions.id,
        position: questions.position,
        type: questions.type,
        prompt: questions.prompt,
        answer: attemptAnswers.answer,
        correctAnswer: questions.answer,
        isCorrect: attemptAnswers.isCorrect,
      })
      .from(attemptAnswers)
      .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
      .where(eq(attemptAnswers.attemptId, attempt.id))
      .orderBy(asc(questions.position))
    return {
      id: attempt.id,
      quiz: { slug: attempt.slug, title: readLocale() === 'en' ? (attempt.titleEn ?? attempt.title) : attempt.title },
      score: attempt.score,
      total: attempt.total,
      createdAt: attempt.createdAt.toISOString(),
      results,
    }
  })
