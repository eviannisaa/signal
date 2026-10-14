import { useCallback, useEffect, useRef, useState } from 'react'

import { unitMs } from '#/lib/morse'
import { createKeySound } from '#/lib/morse-audio'
import type { KeySound, KeyVoice } from '#/lib/morse-audio'
import { LETTER_GAP_UNITS, WORD_GAP_UNITS, classifyPress } from '#/lib/morse-keyer'
import type { TapeMark } from '#/lib/morse-keyer'
import { editMorseInput } from '#/features/practice/practice'

const MAX_MARKS = 240

/** Elemen yang memakai Spasi untuk dirinya sendiri, sehingga tidak boleh ikut mengetuk. */
function ownsSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('[data-telegraph-key]')) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName)
}

/**
 * Kunci telegraf: durasi tekan dibaca sebagai dot atau dash, diam 3 unit menutup huruf,
 * dan diam 7 unit menutup kata. Bunyi keluar langsung saat ditekan (nada atau sounder).
 * Spasi pada keyboard berfungsi sebagai kunci selama `keyboard` aktif.
 */
export function useTelegraphKey({
  wpm,
  voice,
  enabled = true,
  keyboard = true,
  onLetter,
}: {
  wpm: number
  voice: KeyVoice
  enabled?: boolean
  keyboard?: boolean
  /** Dipanggil setiap huruf ditutup, dengan kode lengkap terbaru. */
  onLetter?: (code: string) => void
}) {
  const [code, setCode] = useState('')
  const [marks, setMarks] = useState<TapeMark[]>([])
  const [pressedAt, setPressedAt] = useState<number | null>(null)

  const unit = unitMs(wpm)
  const unitRef = useRef(unit)
  const voiceRef = useRef(voice)
  const enabledRef = useRef(enabled)
  const onLetterRef = useRef(onLetter)
  unitRef.current = unit
  voiceRef.current = voice
  enabledRef.current = enabled
  onLetterRef.current = onLetter

  const codeRef = useRef('')
  const downAt = useRef<number | null>(null)
  const upAt = useRef<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const sound = useRef<KeySound | null>(null)

  const setCodeBoth = useCallback((next: string) => {
    codeRef.current = next
    setCode(next)
  }, [])

  const pushMark = useCallback((mark: TapeMark) => {
    setMarks((m) => (m.length >= MAX_MARKS ? [...m.slice(-MAX_MARKS + 1), mark] : [...m, mark]))
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  /** `at` adalah waktu event (event.timeStamp) agar durasi tidak terpengaruh handler yang tertunda. */
  const down = useCallback((at: number = performance.now()) => {
    if (!enabledRef.current || downAt.current !== null) return
    clearTimers()
    const now = at
    const u = unitRef.current
    // Jeda sebelum tekanan ini ikut tercatat di pita, dibatasi agar pita tidak kosong panjang
    if (upAt.current !== null)
      pushMark({
        on: false,
        ms: Math.min(now - upAt.current, WORD_GAP_UNITS * u),
      })
    downAt.current = now
    setPressedAt(now)
    sound.current ??= createKeySound(voiceRef.current)
    sound.current.down()
  }, [clearTimers, pushMark])

  const up = useCallback((at: number = performance.now()) => {
    if (downAt.current === null) return
    const now = Math.max(at, downAt.current)
    const ms = now - downAt.current
    const u = unitRef.current
    downAt.current = null
    upAt.current = now
    setPressedAt(null)
    sound.current?.up()
    pushMark({ on: true, ms })
    setCodeBoth(editMorseInput(codeRef.current, classifyPress(ms, u)))
    timers.current.push(
      setTimeout(() => {
        const next = editMorseInput(codeRef.current, 'letter')
        setCodeBoth(next)
        onLetterRef.current?.(next)
      }, LETTER_GAP_UNITS * u),
      setTimeout(() => {
        setCodeBoth(editMorseInput(codeRef.current, 'word'))
        upAt.current = null
      }, WORD_GAP_UNITS * u),
    )
  }, [pushMark, setCodeBoth])

  const reset = useCallback(() => {
    clearTimers()
    if (downAt.current !== null) sound.current?.up()
    downAt.current = null
    upAt.current = null
    setPressedAt(null)
    setMarks([])
    setCodeBoth('')
  }, [clearTimers, setCodeBoth])

  // Ganti suara: oscillator lama dilepas, yang baru dibuat saat tekanan berikutnya
  useEffect(() => {
    return () => {
      sound.current?.dispose()
      sound.current = null
    }
  }, [voice])

  // Kunci dinonaktifkan saat sedang ditekan: lepaskan agar bunyi tidak menggantung
  useEffect(() => {
    if (!enabled) {
      clearTimers()
      if (downAt.current !== null) {
        sound.current?.up()
        downAt.current = null
        setPressedAt(null)
      }
    }
  }, [enabled, clearTimers])

  useEffect(() => {
    if (!keyboard) return
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || ownsSpace(e.target)) return
      e.preventDefault()
      if (!e.repeat) down(e.timeStamp)
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || ownsSpace(e.target)) return
      e.preventDefault()
      up(e.timeStamp)
    }
    // Pindah tab atau jendela saat kunci ditahan tidak boleh meninggalkan bunyi menyala
    const release = () => up()
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', release)
    }
  }, [keyboard, down, up])

  useEffect(() => () => clearTimers(), [clearTimers])

  return {
    code,
    marks,
    pressed: pressedAt !== null,
    pressedAt,
    unit,
    down,
    up,
    reset,
  }
}
