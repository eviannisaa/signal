import { defineMessages } from '#/lib/i18n'

/** Teks komponen dasar radio (primitives.tsx) dan lencana peringkat (RankBadge.tsx). */
export const primitivesMessages = defineMessages({
  id: {
    percent: (n: number) => `${n} persen`,
    empty: 'kosong',
    noSignal: 'No signal',
    medals: { gold: 'emas', silver: 'perak', bronze: 'perunggu' },
    rank: (rank: number) => `Peringkat ${rank}`,
    rankTied: (rank: number, medal: string) => `Peringkat ${rank} seri, piala ${medal}`,
    rankMedal: (rank: number, medal: string) => `Peringkat ${rank}, medali ${medal}`,
  },
  en: {
    percent: (n: number) => `${n} percent`,
    empty: 'empty',
    noSignal: 'No signal',
    medals: { gold: 'gold', silver: 'silver', bronze: 'bronze' },
    rank: (rank: number) => `Rank ${rank}`,
    rankTied: (rank: number, medal: string) => `Rank ${rank}, tied, ${medal} trophy`,
    rankMedal: (rank: number, medal: string) => `Rank ${rank}, ${medal} medal`,
  },
})
