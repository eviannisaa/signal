import { encode } from '../../lib/morse'
import type { QuizSeed } from './types'

type Item = ['encode' | 'decode', string]

/** Kode Morse dihitung dengan encode() agar kunci jawaban selalu konsisten dengan tabel. */
function build(items: Item[]): QuizSeed['questions'] {
  return items.map(([type, text]) =>
    type === 'encode' ? { type, prompt: text, answer: encode(text) } : { type, prompt: encode(text), answer: text },
  )
}

export const quizzesSeed: QuizSeed[] = [
  {
    slug: 'kuis-dasar',
    title: 'Kuis Dasar Morse',
    titleEn: 'Morse Basics Quiz',
    lessonSlug: 'dasar-morse',
    questions: build([
      ['encode', 'E'],
      ['decode', 'T'],
      ['encode', 'A'],
      ['decode', 'N'],
      ['encode', 'M'],
      ['decode', 'I'],
      ['encode', 'TEN'],
      ['decode', 'MAN'],
      ['encode', 'TEA'],
      ['decode', 'MINA'],
    ]),
  },
  {
    slug: 'kuis-huruf-pendek',
    title: 'Kuis Huruf Pendek',
    titleEn: 'Short Letters Quiz',
    lessonSlug: 'huruf-pendek',
    questions: build([
      ['encode', 'S'],
      ['decode', 'O'],
      ['encode', 'K'],
      ['decode', 'R'],
      ['encode', 'D'],
      ['decode', 'G'],
      ['encode', 'SOS'],
      ['decode', 'RUSA'],
      ['encode', 'KODE'],
      ['decode', 'WAKTU'],
    ]),
  },
  {
    slug: 'kuis-huruf-panjang',
    title: 'Kuis Huruf Panjang',
    titleEn: 'Long Letters Quiz',
    lessonSlug: 'huruf-panjang',
    questions: build([
      ['encode', 'V'],
      ['decode', 'B'],
      ['encode', 'L'],
      ['decode', 'Y'],
      ['encode', 'P'],
      ['decode', 'Q'],
      ['encode', 'JALAN'],
      ['decode', 'BUKU'],
      ['encode', 'PAGI'],
      ['decode', 'FAJAR'],
    ]),
  },
  {
    slug: 'kuis-angka',
    title: 'Kuis Angka',
    titleEn: 'Numbers Quiz',
    lessonSlug: 'angka',
    questions: build([
      ['encode', '1'],
      ['decode', '5'],
      ['encode', '0'],
      ['decode', '7'],
      ['encode', '3'],
      ['decode', '9'],
      ['encode', '42'],
      ['decode', '2026'],
      ['encode', '108'],
    ]),
  },
  {
    slug: 'kuis-campuran',
    title: 'Kuis Campuran',
    titleEn: 'Mixed Quiz',
    questions: build([
      ['encode', 'HALO'],
      ['decode', 'SINYAL'],
      ['encode', 'RADIO'],
      ['decode', 'KAPAL'],
      ['encode', 'BAIK'],
      ['decode', 'PESAN'],
      ['encode', 'SOS 1'],
      ['decode', 'TERIMA KASIH'],
      ['encode', 'CQ'],
      ['decode', 'PANTAI'],
    ]),
  },
]
