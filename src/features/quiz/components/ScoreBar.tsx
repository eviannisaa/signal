import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { quizMessages } from '../messages'

/** Meter tersegmentasi: satu segmen per soal (atau per unit), diisi sesuai score. Untuk panel gelap. */
export function ScoreBar({ score, total, className, label }: { score: number; total: number; className?: string; label?: string }) {
  const segments = Math.max(1, total)
  const t = useT(quizMessages)
  return (
    <div className={cn('flex h-3 w-full gap-1', className)} role="img" aria-label={label ?? t.scoreOf(score, total)}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn('h-full flex-1 rounded-full transition-colors', i < score ? 'bg-signal-cyan' : 'bg-white/10')}
        />
      ))}
    </div>
  )
}

/** Progress bar cyan sederhana untuk panel gelap. */
export function CyanBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div className="h-full rounded-full bg-signal-cyan transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  )
}
