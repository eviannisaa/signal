import { createHash, randomBytes } from 'node:crypto'

import { notFound } from '@tanstack/react-router'
import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getCookie, setCookie, setResponseHeader, setResponseStatus } from '@tanstack/react-start/server'
import { and, count, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { challengeRounds, gamePlayers, games } from '#/db/schema'
import { generateRounds } from '#/features/challenge/generate'
import { readLocale } from '#/lib/i18n/server'

import { GAME_ID_REGEX, generateGameId } from './id'
import { gameMessages } from './messages'

export type GameType = 'challenge' | 'message'

export interface GamePlayer {
  id: string
  nickname: string
}

export interface GameInfo {
  id: string
  type: GameType
  playerCount: number
  me: GamePlayer | null
}

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/** Pesan error game dalam bahasa permintaan saat ini. */
export function gameErrors() {
  return gameMessages[readLocale()].errors
}

/** Schema ID game untuk Server Function, dengan pesan error sesuai bahasa permintaan. */
export const gameIdInput = z.string().regex(GAME_ID_REGEX, { error: () => gameErrors().invalidGameId })

/** Nickname: 1–20 karakter, tanpa spasi di awal/akhir, hanya huruf, angka, spasi, dan - _ . */
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, { error: () => gameErrors().nicknameRequired })
  .max(20, { error: () => gameErrors().nicknameTooLong(20) })
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u, { error: () => gameErrors().nicknameChars })

function cookieName(gameId: string) {
  return `gp_${gameId}`
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

/** Halaman dan data game tidak diindeks, dan referrer tidak membawa link game ke situs lain. */
function setPrivacyHeaders() {
  setResponseHeader('X-Robots-Tag', 'noindex, nofollow')
  setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

/** Membaca pemain dari cookie gp_<gameId>. Database hanya menyimpan hash token. */
export const readPlayer = createServerOnlyFn(async (gameId: string): Promise<GamePlayer | null> => {
  const token = getCookie(cookieName(gameId))
  if (!token) return null
  const [player] = await db
    .select({ id: gamePlayers.id, nickname: gamePlayers.nickname })
    .from(gamePlayers)
    .where(and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.tokenHash, hashToken(token))))
    .limit(1)
  return player ?? null
})

/** Dipanggil di awal setiap Server Function game. playerId tidak pernah diambil dari input client. */
export const requirePlayer = createServerOnlyFn(async (gameId: string, type?: GameType): Promise<GamePlayer> => {
  const player = await readPlayer(gameId)
  if (!player) {
    setResponseStatus(401)
    throw new Error(gameErrors().notJoined)
  }
  if (type) {
    const [game] = await db.select({ type: games.type }).from(games).where(eq(games.id, gameId)).limit(1)
    if (game?.type !== type) throw new Error(gameErrors().wrongType)
  }
  return player
})

/** Memperbarui last_played_at, dipakai script pembersihan game lama. */
export const touchGame = createServerOnlyFn(async (gameId: string) => {
  await db.update(games).set({ lastPlayedAt: new Date() }).where(eq(games.id, gameId))
})

/** Memastikan soal ronde tersedia. Aman dipanggil berulang karena PK (game_id, position). */
export const ensureRounds = createServerOnlyFn(async (gameId: string) => {
  const [existing] = await db.select({ n: count() }).from(challengeRounds).where(eq(challengeRounds.gameId, gameId))
  if (existing.n > 0) return
  await db
    .insert(challengeRounds)
    .values(generateRounds().map((r) => ({ ...r, gameId })))
    .onConflictDoNothing()
})

export const createGame = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ type: z.enum(['challenge', 'message']) }))
  .handler(async ({ data }) => {
    // Tabrakan ID sangat jarang; jika terjadi, coba sekali lagi dengan ID baru
    for (let attempt = 0; attempt < 2; attempt++) {
      const id = generateGameId()
      const created = await db.transaction(async (tx) => {
        const [row] = await tx.insert(games).values({ id, type: data.type }).onConflictDoNothing().returning({ id: games.id })
        if (!row) return null
        if (data.type === 'challenge') {
          await tx.insert(challengeRounds).values(generateRounds().map((r) => ({ ...r, gameId: id })))
        }
        return row.id
      })
      if (created) return { gameId: created }
    }
    throw new Error(gameErrors().createFailed)
  })

export const getGame = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: gameIdInput }))
  .handler(async ({ data }): Promise<GameInfo> => {
    setPrivacyHeaders()
    const [game] = await db.select({ id: games.id, type: games.type }).from(games).where(eq(games.id, data.gameId)).limit(1)
    if (!game) throw notFound()
    const [{ n }] = await db.select({ n: count() }).from(gamePlayers).where(eq(gamePlayers.gameId, game.id))
    const me = await readPlayer(game.id)
    return { id: game.id, type: game.type, playerCount: n, me }
  })

export const joinGame = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ gameId: gameIdInput, nickname: nicknameSchema }))
  .handler(async ({ data }) => {
    // Cookie valid yang sudah ada mengembalikan pemain yang sama
    const existing = await readPlayer(data.gameId)
    if (existing) return { playerId: existing.id, nickname: existing.nickname }

    const [game] = await db.select({ id: games.id }).from(games).where(eq(games.id, data.gameId)).limit(1)
    if (!game) throw new Error(gameErrors().notFound)

    const [taken] = await db
      .select({ id: gamePlayers.id })
      .from(gamePlayers)
      .where(and(eq(gamePlayers.gameId, data.gameId), sql`lower(${gamePlayers.nickname}) = lower(${data.nickname})`))
      .limit(1)
    if (taken) throw new Error(gameErrors().nicknameTaken)

    const token = randomBytes(32).toString('base64url')
    let player: { id: string; nickname: string } | undefined
    try {
      ;[player] = await db
        .insert(gamePlayers)
        .values({ gameId: data.gameId, nickname: data.nickname, tokenHash: hashToken(token) })
        .returning({ id: gamePlayers.id, nickname: gamePlayers.nickname })
    } catch (err) {
      // Dua pemain mengirim nickname yang sama pada saat bersamaan
      if ((err as { cause?: { code?: string }; code?: string }).cause?.code === '23505' || (err as { code?: string }).code === '23505') {
        throw new Error(gameErrors().nicknameTaken)
      }
      throw err
    }

    setCookie(cookieName(data.gameId), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })
    await touchGame(data.gameId)
    return { playerId: player.id, nickname: player.nickname }
  })
