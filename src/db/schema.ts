import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { user } from './auth-schema'

export * from './auth-schema'

/* ------------------------------------------------------------------ Game */

export const gameType = pgEnum('game_type', ['challenge', 'message'])
export const questionType = pgEnum('question_type', ['encode', 'decode'])

export const games = pgTable(
  'games',
  {
    id: varchar('id', { length: 12 }).primaryKey(),
    type: gameType('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastPlayedAt: timestamp('last_played_at').defaultNow().notNull(),
  },
  // Dipakai script pembersihan game lama
  (t) => [index('games_last_played_at_idx').on(t.lastPlayedAt)],
)

export const gamePlayers = pgTable(
  'game_players',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: varchar('game_id', { length: 12 })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    nickname: varchar('nickname', { length: 20 }).notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (t) => [unique('game_players_game_nickname_uq').on(t.gameId, t.nickname)],
)

/* ------------------------------------------------------- Tantangan Morse */

export const challengeRounds = pgTable(
  'challenge_rounds',
  {
    gameId: varchar('game_id', { length: 12 })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: questionType('type').notNull(),
    prompt: text('prompt').notNull(),
    answer: text('answer').notNull(),
    // Hanya untuk soal decode: salah satu dari CHALLENGE_VIEWS. Tampilan lama (timeline, chart, text)
    // tetap diizinkan agar ronde yang sudah tersimpan tetap valid
    view: text('view'),
  },
  (t) => [
    primaryKey({ columns: [t.gameId, t.position] }),
    check('challenge_rounds_view_ck', sql`${t.view} is null or ${t.view} in ('audio', 'light', 'timeline', 'chart', 'text', 'flag', 'eye', 'mirror')`),
    check('challenge_rounds_view_decode_ck', sql`(${t.type} = 'decode') = (${t.view} is not null)`),
  ],
)

export const challengeResults = pgTable(
  'challenge_results',
  {
    // Satu kesempatan per pemain
    playerId: uuid('player_id')
      .primaryKey()
      .references(() => gamePlayers.id, { onDelete: 'cascade' }),
    gameId: varchar('game_id', { length: 12 })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    submittedAt: timestamp('submitted_at'),
    score: integer('score').default(0).notNull(),
    total: integer('total').notNull(),
    durationMs: integer('duration_ms'),
  },
  (t) => [index('challenge_results_leaderboard_idx').on(t.gameId, t.score.desc(), t.durationMs)],
)

/* ------------------------------------------------------ Kirim Pesan Morse */

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: varchar('game_id', { length: 12 })
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => gamePlayers.id, { onDelete: 'cascade' }),
    text: varchar('text', { length: 40 }).notNull(),
    morse: text('morse').notNull(),
    // Sinyal pilihan pengirim untuk menampilkan pesan kepada penebak (salah satu dari MESSAGE_SIGNALS)
    signal: text('signal').default('text').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('messages_game_created_idx').on(t.gameId, t.createdAt),
    check('messages_signal_ck', sql`${t.signal} in ('text', 'audio', 'light', 'flag', 'eye', 'mirror')`),
  ],
)

export const messageGuesses = pgTable(
  'message_guesses',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => gamePlayers.id, { onDelete: 'cascade' }),
    attempts: integer('attempts').default(0).notNull(),
    isCorrect: boolean('is_correct').default(false).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.playerId] })],
)

/* ---------------------------------------------------------------- Lesson */

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  /** Versi bahasa Inggris. Jika kosong, konten bahasa Indonesia yang ditampilkan */
  titleEn: text('title_en'),
  position: integer('position').notNull().unique(),
  description: text('description').notNull(),
  descriptionEn: text('description_en'),
  characters: text('characters').array().notNull(),
})

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
)

/* ------------------------------------------------------------------ Quiz */

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  /** Versi bahasa Inggris. Jika kosong, judul bahasa Indonesia yang ditampilkan */
  titleEn: text('title_en'),
  lessonId: integer('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
})

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    type: questionType('type').notNull(),
    prompt: text('prompt').notNull(),
    answer: text('answer').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [unique('questions_quiz_position_uq').on(t.quizId, t.position)],
)

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    quizId: integer('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('quiz_attempts_user_quiz_idx').on(t.userId, t.quizId), index('quiz_attempts_user_created_idx').on(t.userId, t.createdAt)],
)

export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => quizAttempts.id, { onDelete: 'cascade' }),
    questionId: integer('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    answer: text('answer').notNull(),
    isCorrect: boolean('is_correct').notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
)

/* ------------------------------------------------------------- Relations */

export const gamesRelations = relations(games, ({ many }) => ({
  players: many(gamePlayers),
  rounds: many(challengeRounds),
  messages: many(messages),
}))

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(gamePlayers, { fields: [messages.senderId], references: [gamePlayers.id] }),
  guesses: many(messageGuesses),
}))

export const messageGuessesRelations = relations(messageGuesses, ({ one }) => ({
  message: one(messages, { fields: [messageGuesses.messageId], references: [messages.id] }),
}))

export const quizzesRelations = relations(quizzes, ({ many, one }) => ({
  questions: many(questions),
  lesson: one(lessons, { fields: [quizzes.lessonId], references: [lessons.id] }),
}))

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
}))

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizAttempts.quizId], references: [quizzes.id] }),
  answers: many(attemptAnswers),
}))

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
  attempt: one(quizAttempts, { fields: [attemptAnswers.attemptId], references: [quizAttempts.id] }),
  question: one(questions, { fields: [attemptAnswers.questionId], references: [questions.id] }),
}))
