import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Loader2 } from 'lucide-react'

import { SignalLed } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { useT } from '#/lib/i18n'

import { joinGame } from '../server'
import { gameMessages } from '../messages'

const MAX = 20

/** Validasi di browser sama dengan Zod di server, agar pesan muncul tanpa round trip. */
function checkNickname(value: string, errors: (typeof gameMessages)['id']['errors']): string | null {
  const v = value.trim()
  if (!v) return errors.nicknameRequired
  if (v.length > MAX) return errors.nicknameTooLong(MAX)
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(v)) return errors.nicknameChars
  return null
}

/**
 * Popup CALLSIGN. Tidak dapat ditutup (Escape, klik di luar, atau tombol tutup)
 * sebelum nickname valid berhasil dikirim.
 */
export function NicknameDialog({ gameId }: { gameId: string }) {
  const m = useT(gameMessages)
  const t = m.nickname
  const router = useRouter()
  const queryClient = useQueryClient()
  const join = useServerFn(joinGame)
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const inputId = useId()
  const errorId = useId()
  const hintId = useId()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const problem = checkNickname(nickname, m.errors)
    if (problem) {
      setError(problem)
      return
    }
    setPending(true)
    setError(null)
    try {
      await join({ data: { gameId, nickname: nickname.trim() } })
      await router.invalidate()
      await queryClient.invalidateQueries({ queryKey: ['game', gameId] })
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveFailed)
      setPending(false)
    }
  }

  const length = nickname.trim().length
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="radio-panel gap-0 border-white/12 bg-[#0b1120]/85 p-0 text-signal-offwhite shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:max-w-md"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
          <SignalLed blink={pending} size="sm" />
          <span className="radio-label text-signal-cyan">{t.callsign}</span>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <DialogTitle className="text-2xl font-semibold">{t.title}</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-signal-offwhite/65">
              {t.description}
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor={inputId} className="radio-label text-signal-offwhite/70">
                {t.label}
              </label>
              <span id={hintId} className="font-mono text-xs text-signal-offwhite/50" aria-live="polite">
                {length}/{MAX}
              </span>
            </div>
            <Input
              id={inputId}
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                if (error) setError(null)
              }}
              maxLength={MAX + 5}
              autoFocus
              autoComplete="nickname"
              spellCheck={false}
              placeholder={t.placeholder}
              aria-invalid={!!error}
              aria-describedby={error ? `${errorId} ${hintId}` : hintId}
              className="h-12 rounded-xl border-white/15 bg-black/25 font-mono text-lg tracking-wide text-signal-offwhite placeholder:text-signal-offwhite/30"
            />
          </div>
          {error && (
            <p id={errorId} role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="h-11 rounded-xl text-base">
            {pending && <Loader2 className="animate-spin" />}
            {pending ? t.joining : t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
