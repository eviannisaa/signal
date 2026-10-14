import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ALL_VIEWS, LETTERS, MORSE_TABLE, toDitDah } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSymbols, SignalLed } from '#/components/radio/primitives'
import { useT } from '#/lib/i18n'
import { explorerMessages } from '../messages'
import { LetterPicker } from './LetterPicker'

export const EXPLORER_VIEW_KEY = 'signal:explorer-view'
const viewSchema = z.enum(ALL_VIEWS)

function readStoredView(): MorseView | null {
  try {
    const parsed = viewSchema.safeParse(window.localStorage.getItem(EXPLORER_VIEW_KEY))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function storeView(view: MorseView) {
  try {
    window.localStorage.setItem(EXPLORER_VIEW_KEY, view)
  } catch {
    // localStorage tidak tersedia (mode privat atau diblokir): pilihan hanya berlaku di sesi ini.
  }
}

/** Morse Explorer: pilih huruf A–Z lalu lihat dalam lima representasi. */
export function MorseExplorer() {
  const t = useT(explorerMessages)
  const [letter, setLetter] = useState('A')
  // SSR selalu memakai Audio Signal; pilihan tersimpan dibaca setelah mount.
  const [view, setView] = useState<MorseView>('audio')

  useEffect(() => {
    const stored = readStoredView()
    if (stored) setView(stored)
  }, [])

  function changeView(next: MorseView) {
    setView(next)
    storeView(next)
  }

  const code = MORSE_TABLE[letter] ?? ''

  // Tanpa kartu, sama seperti bagian Game dan Area Belajar: dua kolom dibatasi garis tipis
  return (
    <div className="border-y border-white/10">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5 border-b border-white/10 py-7 lg:border-r lg:border-b-0 lg:pr-10">
          <div className="flex items-center justify-between gap-3">
            <span className="radio-label flex items-center gap-2 text-signal-offwhite/70">
              <SignalLed size="sm" /> {t.pickLetter}
            </span>
            <span className="radio-label text-signal-offwhite/40" aria-hidden="true">
              {t.letterCount(LETTERS.length)}
            </span>
          </div>
          <LetterPicker letters={LETTERS} value={letter} onChange={setLetter} />
          {/* Petunjuk keyboard fisik, disembunyikan di layar kecil yang umumnya tanpa keyboard */}
          <p className="mt-auto hidden text-xs leading-relaxed text-signal-offwhite/45 sm:block">
            {t.keyboardHintBefore} <Key icon={ArrowLeft} label={t.arrows.left} /> <Key icon={ArrowRight} label={t.arrows.right} /> <Key icon={ArrowUp} label={t.arrows.up} />{' '}
            <Key icon={ArrowDown} label={t.arrows.down} /> {t.keyboardHintAfter}
          </p>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-6 py-7 sm:gap-8 lg:px-10">
            <span className="w-16 shrink-0 font-mono text-7xl leading-none font-light text-signal-offwhite sm:w-20 sm:text-8xl">
              {letter}
            </span>
            <div className="flex min-w-0 flex-col gap-3">
              <MorseSymbols code={code} size="xs" />
              <span className="font-mono text-sm text-signal-offwhite/60">{toDitDah(code)}</span>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {letter}: {toDitDah(code)}
          </p>
          {/* Viewer dipakai juga di halaman lain sebagai panel tersendiri; di sini menyatu dengan panel ini, termasuk
              tanpa gradasi dan blur kaca tambahan dari gaya .landing .radio-panel */}
          <MorseViewer
            value={letter}
            view={view}
            onViewChange={changeView}
            mode="learn"
            className="flex-1 rounded-none! border-0! border-t! border-white/10! bg-transparent! bg-none! shadow-none! backdrop-blur-none! [&>:first-child]:px-0! [&>:first-child]:py-4! lg:[&>:first-child]:px-10! [&>[role=tabpanel]]:px-0! lg:[&>[role=tabpanel]]:px-10!"
          />
        </div>
      </div>
    </div>
  )
}

/** Tombol keyboard kecil. Ikon SVG di tengah kotak agar sejajar vertikal, tidak bergantung pada garis dasar font. */
function Key({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const t = useT(explorerMessages)
  return (
    <kbd className="inline-flex size-4 items-center justify-center rounded border border-white/15 align-middle" aria-label={t.arrowLabel(label)}>
      <Icon className="size-2.5" aria-hidden="true" />
    </kbd>
  )
}
