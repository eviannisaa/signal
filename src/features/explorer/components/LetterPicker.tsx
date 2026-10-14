import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { explorerMessages } from '../messages'

/** Jumlah kolom grid saat ini, dibaca dari layout agar navigasi atas/bawah sesuai tampilan. */
function columnCount(grid: HTMLElement | null): number {
  if (!grid) return 1
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
  return Math.max(1, cols)
}

/** Grid tombol huruf dengan roving tabindex dan navigasi tombol panah. */
export function LetterPicker({
  letters,
  value,
  onChange,
  className,
}: {
  letters: readonly string[]
  value: string
  onChange: (letter: string) => void
  className?: string
}) {
  const t = useT(explorerMessages)
  const gridRef = useRef<HTMLDivElement>(null)

  function focusIndex(index: number) {
    const next = letters[index]
    if (next === undefined) return
    onChange(next)
    gridRef.current?.querySelectorAll<HTMLButtonElement>('button')[index]?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const cols = columnCount(gridRef.current)
    const last = letters.length - 1
    let target: number | null = null
    switch (e.key) {
      case 'ArrowRight':
        target = index === last ? 0 : index + 1
        break
      case 'ArrowLeft':
        target = index === 0 ? last : index - 1
        break
      case 'ArrowDown':
        target = index + cols <= last ? index + cols : index
        break
      case 'ArrowUp':
        target = index - cols >= 0 ? index - cols : index
        break
      case 'Home':
        target = 0
        break
      case 'End':
        target = last
        break
    }
    if (target === null) return
    e.preventDefault()
    focusIndex(target)
  }

  return (
    <div ref={gridRef} role="group" aria-label={t.pickerLabel} className={cn('grid grid-cols-6 gap-1.5 min-[400px]:grid-cols-7 sm:grid-cols-9 sm:gap-2 lg:grid-cols-7', className)}>
      {letters.map((letter, i) => {
        const selected = letter === value
        return (
          <button
            key={letter}
            type="button"
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(letter)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              // Huruf polos tanpa kotak; huruf terpilih cyan dengan garis bawah menyala
              'relative aspect-square min-h-10 rounded-md font-mono text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan',
              selected
                ? 'text-signal-cyan after:absolute after:inset-x-3 after:bottom-1.5 after:h-px after:bg-signal-cyan after:shadow-[0_0_8px_1px_rgb(6_182_212/0.8)]'
                : 'text-signal-offwhite/55 hover:bg-white/[0.04] hover:text-signal-offwhite',
            )}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}
