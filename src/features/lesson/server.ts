import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { lessonProgress, lessons } from '#/db/schema'
import { requireUser } from '#/features/auth/server'
import { readLocale } from '#/lib/i18n/server'
import { lessonMessages } from './messages'

const slugInput = z.object({ slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/) })

export interface LessonListItem {
  id: number
  slug: string
  title: string
  position: number
  characters: string[]
  completed: boolean
}

export interface LessonDetail {
  id: number
  slug: string
  title: string
  position: number
  description: string
  characters: string[]
  completed: boolean
  completedAt: string | null
  total: number
  prev: { slug: string; title: string } | null
  next: { slug: string; title: string } | null
}

/** Daftar lesson berurutan beserta status selesai milik pengguna yang login. */
export const getLessons = createServerFn({ method: 'GET' }).handler(async (): Promise<LessonListItem[]> => {
  const user = await requireUser()
  const en = readLocale() === 'en'
  const rows = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      titleEn: lessons.titleEn,
      position: lessons.position,
      characters: lessons.characters,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessons)
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, user.id)))
    .orderBy(asc(lessons.position))
  return rows.map(({ completedAt, titleEn, ...l }) => ({ ...l, title: en ? (titleEn ?? l.title) : l.title, completed: completedAt !== null }))
})

/** Detail satu lesson beserta lesson sebelum dan sesudahnya. null jika slug tidak ada (loader melempar notFound). */
export const getLesson = createServerFn({ method: 'GET' })
  .inputValidator(slugInput)
  .handler(async ({ data }): Promise<LessonDetail | null> => {
    const user = await requireUser()
    const en = readLocale() === 'en'
    const all = await db
      .select({ id: lessons.id, slug: lessons.slug, title: lessons.title, titleEn: lessons.titleEn })
      .from(lessons)
      .orderBy(asc(lessons.position))
    const index = all.findIndex((l) => l.slug === data.slug)
    if (index === -1) return null

    const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, all[index].id) })
    if (!lesson) return null
    const progress = await db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)),
    })
    const pick = (l: (typeof all)[number] | undefined) => (l ? { slug: l.slug, title: en ? (l.titleEn ?? l.title) : l.title } : null)
    return {
      id: lesson.id,
      slug: lesson.slug,
      title: en ? (lesson.titleEn ?? lesson.title) : lesson.title,
      position: lesson.position,
      description: en ? (lesson.descriptionEn ?? lesson.description) : lesson.description,
      characters: lesson.characters,
      completed: !!progress,
      completedAt: progress ? progress.completedAt.toISOString() : null,
      total: all.length,
      prev: pick(all[index - 1]),
      next: pick(all[index + 1]),
    }
  })

/** Menandai lesson selesai. Aman dipanggil berulang kali (tidak membuat data ganda). */
export const completeLesson = createServerFn({ method: 'POST' })
  .inputValidator(slugInput)
  .handler(async ({ data }): Promise<{ completedAt: string }> => {
    const user = await requireUser()
    const lesson = await db.query.lessons.findFirst({ where: eq(lessons.slug, data.slug), columns: { id: true } })
    if (!lesson) throw new Error(lessonMessages[readLocale()].errors.notFound)
    await db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id }).onConflictDoNothing()
    const row = await db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)),
    })
    return { completedAt: (row?.completedAt ?? new Date()).toISOString() }
  })
