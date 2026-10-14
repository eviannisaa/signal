export interface LessonSeed {
  slug: string
  title: string
  titleEn: string
  position: number
  /** Materi lesson (paragraf dipisah baris kosong). */
  description: string
  /** Materi lesson dalam bahasa Inggris, paragrafnya sama dengan `description`. */
  descriptionEn: string
  characters: string[]
}

export interface QuizSeed {
  slug: string
  title: string
  titleEn: string
  /** Slug lesson terkait (opsional). */
  lessonSlug?: string
  questions: { type: 'encode' | 'decode'; prompt: string; answer: string }[]
}
