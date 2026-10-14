import { VIEWER_TABS, encode } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { randomPrompt } from '#/lib/prompts'
import type { PromptLevel } from '#/lib/prompts'

export const QUESTION_COUNT = 10

/** Tampilan soal decode, sama dengan tab di Morse Explorer: bunyi, lampu, bendera, mata, dan cermin. */
export const CHALLENGE_VIEWS = VIEWER_TABS

export type ChallengeQuestionType = 'encode' | 'decode'

/** Satu soal ronde lengkap dengan kunci jawaban. Hanya dipakai di server. */
export interface GeneratedRound {
  position: number
  type: ChallengeQuestionType
  /** encode: teks yang harus diubah ke Morse. decode: kode Morse soal. */
  prompt: string
  /** encode: kode Morse. decode: teks. */
  answer: string
  /** Hanya untuk soal decode, null untuk soal encode. */
  view: MorseView | null
}

/** Tingkat soal per posisi: dimulai dari huruf, lalu kata pendek, lalu kata panjang. */
const LEVEL_PLAN: PromptLevel[] = ['letter', 'letter', 'letter', 'short', 'short', 'short', 'short', 'short', 'long', 'long']

/** Fisher–Yates dengan sumber acak yang dapat diganti untuk test. */
function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Membuat 10 soal campuran (5 encode, 5 decode) dari lib/prompts.
 * Setiap soal decode diberi view dari CHALLENGE_VIEWS secara bergiliran dengan urutan
 * awal acak, sehingga kelima representasi muncul dalam satu ronde.
 */
export function generateRounds(random: () => number = Math.random): GeneratedRound[] {
  const decodeCount = Math.ceil(QUESTION_COUNT / 2)
  const types = shuffle<ChallengeQuestionType>(
    Array.from({ length: QUESTION_COUNT }, (_, i) => (i < decodeCount ? 'decode' : 'encode')),
    random,
  )
  const viewStart = Math.floor(random() * CHALLENGE_VIEWS.length)
  const used = new Set<string>()
  let decodeIndex = 0

  return types.map((type, position) => {
    const level = LEVEL_PLAN[position] ?? 'short'
    let text = randomPrompt(level, random)
    // Hindari soal yang sama dalam satu ronde
    for (let tries = 0; used.has(text) && tries < 20; tries++) text = randomPrompt(level, random)
    used.add(text)
    const code = encode(text)
    if (type === 'encode') return { position, type, prompt: text, answer: code, view: null }
    const view = CHALLENGE_VIEWS[(viewStart + decodeIndex++) % CHALLENGE_VIEWS.length]
    return { position, type, prompt: code, answer: text, view }
  })
}
