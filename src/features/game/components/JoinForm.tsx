import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircle, ArrowRight, Link2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useT } from '#/lib/i18n'

import { parseGameInput } from '../id'
import { gameMessages } from '../messages'

/** Form bergabung dengan menempelkan link game atau kode 12 karakter. */
export function JoinForm() {
  const t = useT(gameMessages).join
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!value.trim()) {
      setError(t.emptyError)
      return
    }
    const gameId = parseGameInput(value)
    if (!gameId) {
      setError(t.invalidError)
      return
    }
    setError(null)
    void navigate({ to: '/g/$gameId', params: { gameId } })
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:p-7 md:flex-row md:items-center md:gap-6"
    >
      {/* Kartu kaca, senada dengan panel Explorer */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="flex items-start gap-3 md:w-72 md:shrink-0">
        <Link2 className="mt-0.5 size-4 shrink-0 text-signal-cyan" aria-hidden="true" />
        <div>
          <label htmlFor={inputId} className="text-sm font-semibold">
            {t.title}
          </label>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={inputId}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
            placeholder={t.placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="h-10 flex-1 font-mono text-sm"
          />
          <Button type="submit" size="lg" className="h-10 px-5">
            {t.submit} <ArrowRight />
          </Button>
        </div>
        {error && (
          <p id={errorId} role="alert" className="flex items-start gap-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </form>
  )
}
