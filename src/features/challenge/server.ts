import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { challengeResults, challengeRounds, gamePlayers } from '#/db/schema'
import type { MorseView } from '#/lib/morse'
import { ensureRounds, gameIdInput, readPlayer, requirePlayer, touchGame } from '#/features/game/server'
import { readLocale } from '#/lib/i18n/server'

import type { ChallengeQuestionType } from './generate'
import { TIME_LIMIT_SEC, gradeChallenge, isLateSubmit } from './score'
import type { QuestionResult, RoundKey } from './score'
import { challengeMessages } from './messages'

/** Soal yang dikirim ke browser: tanpa field answer. */
export interface PublicRound {
  position: number
  type: ChallengeQuestionType
  prompt: string
  view: MorseView | null
}

export interface RunningChallenge {
  status: 'running'
  rounds: PublicRound[]
  timeLimitSec: number
  startedAt: string
  /** Waktu server saat response dibuat, untuk menyamakan timer browser. */
  serverNow: string
}

export interface SubmittedChallenge {
  status: 'submitted'
  score: number
  total: number
  durationMs: number
  late: boolean
  /** given hanya terisi tepat setelah submit; jawaban per soal tidak disimpan. */
  results: (Omit<QuestionResult, 'given'> & { given: string | null })[]
}

export type ChallengeState = { status: 'idle' } | RunningChallenge | SubmittedChallenge

const loadRounds = createServerOnlyFn(async (gameId: string): Promise<RoundKey[]> => {
  await ensureRounds(gameId)
  const rows = await db
    .select({
      position: challengeRounds.position,
      type: challengeRounds.type,
      prompt: challengeRounds.prompt,
      answer: challengeRounds.answer,
      view: challengeRounds.view,
    })
    .from(challengeRounds)
    .where(eq(challengeRounds.gameId, gameId))
    .orderBy(asc(challengeRounds.position))
  return rows.map((r) => ({ ...r, view: (r.view as MorseView | null) ?? null }))
})

/** Sengaja hanya memilih field yang aman; kunci jawaban tidak pernah ikut. */
function toPublic(rounds: RoundKey[]): PublicRound[] {
  return rounds.map(({ position, type, prompt, view }) => ({ position, type, prompt, view }))
}

function running(rounds: RoundKey[], startedAt: Date): RunningChallenge {
  return {
    status: 'running',
    rounds: toPublic(rounds),
    timeLimitSec: TIME_LIMIT_SEC,
    startedAt: startedAt.toISOString(),
    serverNow: new Date().toISOString(),
  }
}

/** Status tantangan pemain saat ini, dipakai saat halaman dibuka atau dimuat ulang. */
export const getMyChallenge = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: gameIdInput }))
  .handler(async ({ data }): Promise<ChallengeState> => {
    const player = await requirePlayer(data.gameId, 'challenge')
    const [result] = await db.select().from(challengeResults).where(eq(challengeResults.playerId, player.id)).limit(1)
    if (!result) return { status: 'idle' }
    const rounds = await loadRounds(data.gameId)
    if (!result.submittedAt) return running(rounds, result.startedAt)
    const durationMs = result.durationMs ?? 0
    // Kunci jawaban boleh dilihat setelah pemain mengirim jawabannya sendiri
    return {
      status: 'submitted',
      score: result.score,
      total: result.total,
      durationMs,
      late: isLateSubmit(result.startedAt, result.submittedAt),
      results: rounds.map((r) => ({ position: r.position, type: r.type, prompt: r.prompt, view: r.view, given: null, expected: r.answer, correct: false })),
    }
  })

export const startChallenge = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ gameId: gameIdInput }))
  .handler(async ({ data }): Promise<RunningChallenge> => {
    const player = await requirePlayer(data.gameId, 'challenge')
    const rounds = await loadRounds(data.gameId)
    // Satu kesempatan per pemain (PK player_id). Jika sudah dimulai, started_at tetap sama.
    await db
      .insert(challengeResults)
      .values({ playerId: player.id, gameId: data.gameId, startedAt: new Date(), total: rounds.length })
      .onConflictDoNothing()
    const [result] = await db.select().from(challengeResults).where(eq(challengeResults.playerId, player.id)).limit(1)
    if (result.submittedAt) throw new Error(challengeMessages[readLocale()].errors.alreadyFinished)
    await touchGame(data.gameId)
    return running(rounds, result.startedAt)
  })

export const submitChallenge = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      gameId: gameIdInput,
      answers: z.array(z.object({ position: z.number().int().min(0).max(99), answer: z.string().max(200) })).max(50),
    }),
  )
  .handler(async ({ data }): Promise<SubmittedChallenge> => {
    const player = await requirePlayer(data.gameId, 'challenge')
    const submittedAt = new Date()
    const outcome = await db.transaction(async (tx) => {
      const [result] = await tx.select().from(challengeResults).where(eq(challengeResults.playerId, player.id)).for('update').limit(1)
      if (!result) throw new Error(challengeMessages[readLocale()].errors.notStarted)
      if (result.submittedAt) throw new Error(challengeMessages[readLocale()].errors.alreadySubmitted)
      const rounds = await loadRounds(data.gameId)
      // Durasi dihitung dari waktu server, bukan dari timer browser
      const late = isLateSubmit(result.startedAt, submittedAt)
      const graded = gradeChallenge(rounds, data.answers, late)
      const durationMs = Math.max(0, submittedAt.getTime() - result.startedAt.getTime())
      const updated = await tx
        .update(challengeResults)
        .set({ submittedAt, score: graded.score, total: graded.total, durationMs })
        .where(and(eq(challengeResults.playerId, player.id), isNull(challengeResults.submittedAt)))
        .returning({ playerId: challengeResults.playerId })
      if (!updated.length) throw new Error(challengeMessages[readLocale()].errors.alreadySubmitted)
      return { status: 'submitted' as const, score: graded.score, total: graded.total, durationMs, late, results: graded.results }
    })
    await touchGame(data.gameId)
    return outcome
  })

export interface LeaderboardEntry {
  rank: number
  nickname: string
  score: number
  total: number
  durationMs: number
  isMe: boolean
}

export const getLeaderboard = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ gameId: gameIdInput }))
  .handler(async ({ data }): Promise<LeaderboardEntry[]> => {
    const me = await readPlayer(data.gameId)
    const rows = await db
      .select({
        playerId: challengeResults.playerId,
        nickname: gamePlayers.nickname,
        score: challengeResults.score,
        total: challengeResults.total,
        durationMs: challengeResults.durationMs,
      })
      .from(challengeResults)
      .innerJoin(gamePlayers, eq(gamePlayers.id, challengeResults.playerId))
      .where(and(eq(challengeResults.gameId, data.gameId), isNotNull(challengeResults.submittedAt)))
      .orderBy(desc(challengeResults.score), asc(challengeResults.durationMs), asc(challengeResults.submittedAt))
      .limit(100)
    return rows.map((r, i) => ({
      rank: i + 1,
      nickname: r.nickname,
      score: r.score,
      total: r.total,
      durationMs: r.durationMs ?? 0,
      isMe: r.playerId === me?.id,
    }))
  })
