import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { gamePlayers, messageGuesses, messages } from '#/db/schema'
import { encode, isSameAnswer, normalizeText } from '#/lib/morse'
import { gameIdInput, requirePlayer, touchGame } from '#/features/game/server'
import { readLocale } from '#/lib/i18n/server'

import { FEED_LIMIT, MESSAGE_SIGNALS, MAX_GUESS_ATTEMPTS, MAX_MESSAGE_LENGTH, SEND_COOLDOWN_MS, attemptsLeft, computeScores, messageStatus, validateMessageText } from './score'
import type { MessageSignal, MessageStatus } from './score'
import { messageMessages } from './messages'

/** Pesan error Kirim Pesan dalam bahasa permintaan saat ini. */
function errors() {
  return messageMessages[readLocale()].errors
}

export interface FeedMessage {
  id: string
  sender: string
  isMine: boolean
  morse: string
  /** Sinyal pilihan pengirim; pesan ditampilkan kepada penebak dalam sinyal ini. */
  signal: MessageSignal
  /** Hanya terisi jika pembaca adalah pengirim, sudah menebak benar, atau kesempatannya habis. */
  text: string | null
  myStatus: MessageStatus
  attemptsLeft: number
  /** Jumlah pemain yang berhasil menebak pesan ini. */
  solvedBy: number
  /** Jumlah pemain yang sudah mencoba menebak pesan ini, benar maupun salah. */
  guessedBy: number
  /** Nama penebak beserta hasilnya, terlihat oleh semua pemain. Isi pesan tetap tersembunyi lewat field text. */
  guessers: { nickname: string; correct: boolean }[]
  createdAt: string
}

export interface ScoreEntry {
  nickname: string
  points: number
  guessed: number
  decodedBy: number
  isMe: boolean
}

export interface MessageFeed {
  messages: FeedMessage[]
  scores: ScoreEntry[]
  playerCount: number
}

export const sendMessage = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      gameId: gameIdInput,
      text: z.string().max(MAX_MESSAGE_LENGTH * 2),
      signal: z.enum(MESSAGE_SIGNALS, { error: () => errors().chooseSignal }),
    }),
  )
  .handler(async ({ data }) => {
    const player = await requirePlayer(data.gameId, 'message')
    const error = validateMessageText(data.text, readLocale())
    if (error) throw new Error(error)
    const text = normalizeText(data.text)

    // Batas pengiriman: satu pesan per 5 detik per pemain
    const [last] = await db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.senderId, player.id))
      .orderBy(desc(messages.createdAt))
      .limit(1)
    const now = new Date()
    if (last && now.getTime() - last.createdAt.getTime() < SEND_COOLDOWN_MS) {
      const wait = Math.ceil((SEND_COOLDOWN_MS - (now.getTime() - last.createdAt.getTime())) / 1000)
      throw new Error(errors().cooldown(wait))
    }

    const morse = encode(text)
    const [row] = await db
      .insert(messages)
      .values({ gameId: data.gameId, senderId: player.id, text, morse, signal: data.signal, createdAt: now })
      .returning({ id: messages.id })
    await touchGame(data.gameId)
    return { messageId: row.id, morse }
  })

export const getMessages = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: gameIdInput }))
  .handler(async ({ data }): Promise<MessageFeed> => {
    const me = await requirePlayer(data.gameId, 'message')
    const fallbackName = errors().player

    const [players, latest, correct] = await Promise.all([
      db.select({ id: gamePlayers.id, nickname: gamePlayers.nickname }).from(gamePlayers).where(eq(gamePlayers.gameId, data.gameId)),
      db
        .select({ id: messages.id, senderId: messages.senderId, text: messages.text, morse: messages.morse, signal: messages.signal, createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.gameId, data.gameId))
        .orderBy(desc(messages.createdAt))
        .limit(FEED_LIMIT),
      // Score dihitung dari message_guesses, tanpa tabel score terpisah
      db
        .select({ messageId: messageGuesses.messageId, guesserId: messageGuesses.playerId, senderId: messages.senderId })
        .from(messageGuesses)
        .innerJoin(messages, eq(messages.id, messageGuesses.messageId))
        .where(and(eq(messages.gameId, data.gameId), eq(messageGuesses.isCorrect, true))),
    ])

    const ids = latest.map((m) => m.id)
    const myGuesses = ids.length
      ? await db
          .select({ messageId: messageGuesses.messageId, attempts: messageGuesses.attempts, isCorrect: messageGuesses.isCorrect })
          .from(messageGuesses)
          .where(and(eq(messageGuesses.playerId, me.id), inArray(messageGuesses.messageId, ids)))
      : []
    const guessByMessage = new Map(myGuesses.map((g) => [g.messageId, g]))
    // Semua penebak per pesan (satu baris message_guesses per pemain per pesan), urut dari yang paling awal
    const allGuesses = ids.length
      ? await db
          .select({ messageId: messageGuesses.messageId, playerId: messageGuesses.playerId, isCorrect: messageGuesses.isCorrect })
          .from(messageGuesses)
          .where(inArray(messageGuesses.messageId, ids))
          .orderBy(asc(messageGuesses.updatedAt))
      : []
    const guessersByMessage = new Map<string, { playerId: string; isCorrect: boolean }[]>()
    for (const g of allGuesses) guessersByMessage.set(g.messageId, [...(guessersByMessage.get(g.messageId) ?? []), g])
    const nicknames = new Map(players.map((p) => [p.id, p.nickname]))
    const solvedCount = new Map<string, number>()
    for (const c of correct) solvedCount.set(c.messageId, (solvedCount.get(c.messageId) ?? 0) + 1)

    const feed: FeedMessage[] = latest.map((m) => {
      const isMine = m.senderId === me.id
      const guess = guessByMessage.get(m.id)
      const status = messageStatus(isMine, guess)
      const guessers = guessersByMessage.get(m.id) ?? []
      return {
        id: m.id,
        sender: nicknames.get(m.senderId) ?? fallbackName,
        isMine,
        morse: m.morse,
        signal: m.signal as MessageSignal,
        // Teks asli tidak dikirim selama pesan masih harus ditebak
        text: status === 'open' ? null : m.text,
        myStatus: status,
        attemptsLeft: isMine ? 0 : attemptsLeft(guess),
        solvedBy: solvedCount.get(m.id) ?? 0,
        guessedBy: guessers.length,
        guessers: guessers.map((g) => ({ nickname: nicknames.get(g.playerId) ?? fallbackName, correct: g.isCorrect })),
        createdAt: m.createdAt.toISOString(),
      }
    })

    const scores = computeScores(players, correct).map((s) => ({
      nickname: s.nickname,
      points: s.points,
      guessed: s.guessed,
      decodedBy: s.decodedBy,
      isMe: s.playerId === me.id,
    }))

    return { messages: feed, scores, playerCount: players.length }
  })

export const guessMessage = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ gameId: gameIdInput, messageId: z.uuid(), guess: z.string().trim().min(1, { error: () => errors().emptyGuess }).max(80) }))
  .handler(async ({ data }) => {
    const player = await requirePlayer(data.gameId, 'message')
    const [message] = await db
      .select({ id: messages.id, senderId: messages.senderId, text: messages.text })
      .from(messages)
      .where(and(eq(messages.id, data.messageId), eq(messages.gameId, data.gameId)))
      .limit(1)
    if (!message) throw new Error(errors().notFound)
    if (message.senderId === player.id) throw new Error(errors().ownMessage)

    const correct = isSameAnswer(data.guess, message.text)
    // Upsert atomik: hanya bertambah jika belum benar dan kesempatan masih ada
    const [row] = await db
      .insert(messageGuesses)
      .values({ messageId: message.id, playerId: player.id, attempts: 1, isCorrect: correct, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [messageGuesses.messageId, messageGuesses.playerId],
        set: { attempts: sql`${messageGuesses.attempts} + 1`, isCorrect: correct, updatedAt: new Date() },
        setWhere: and(eq(messageGuesses.isCorrect, false), lt(messageGuesses.attempts, MAX_GUESS_ATTEMPTS)),
      })
      .returning({ attempts: messageGuesses.attempts, isCorrect: messageGuesses.isCorrect })

    if (!row) {
      const [current] = await db
        .select({ isCorrect: messageGuesses.isCorrect })
        .from(messageGuesses)
        .where(and(eq(messageGuesses.messageId, message.id), eq(messageGuesses.playerId, player.id)))
        .limit(1)
      throw new Error(current?.isCorrect ? errors().alreadyCorrect : errors().noAttempts)
    }

    await touchGame(data.gameId)
    const left = attemptsLeft(row)
    return { correct: row.isCorrect, attemptsLeft: row.isCorrect ? 0 : left, text: row.isCorrect || left === 0 ? message.text : null }
  })
