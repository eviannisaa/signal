import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { authClient } from '#/lib/auth-client'
import { useT } from '#/lib/i18n'
import { safeRedirect } from '#/lib/safe-redirect'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RadioPanel, SignalLed } from '#/components/radio/primitives'
import { authMessages } from '../messages'
import { PasswordInput } from './PasswordInput'

/** Form login dan register di dalam panel AUTH. */
export function AuthForm({ mode, redirect }: { mode: 'login' | 'register'; redirect?: string }) {
  const router = useRouter()
  const t = useT(authMessages)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const target = safeRedirect(redirect)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '').trim()
    setPending(true)
    setError(null)
    const res =
      mode === 'login'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name })
    if (res.error) {
      setPending(false)
      const code = res.error.code ?? ''
      setError(
        code.includes('USER_ALREADY_EXISTS')
          ? t.errors.userExists
          : code.includes('INVALID_EMAIL_OR_PASSWORD')
            ? t.errors.invalidCredentials
            : code.includes('PASSWORD_TOO_SHORT')
              ? t.errors.passwordTooShort
              : t.errors.generic,
      )
      return
    }
    await router.invalidate()
    await router.navigate({ to: target })
  }

  const isLogin = mode === 'login'
  return (
    <div className="mx-auto w-full max-w-md">
      <RadioPanel title="Auth" led={pending ? 'blink' : true}>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{isLogin ? t.loginTitle : t.registerTitle}</h1>
          <p className="mt-1.5 text-sm text-signal-offwhite/65">
            {isLogin ? t.loginSubtitle : t.registerSubtitle}
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
          {!isLogin && (
            <Field id="name" label={t.name} required>
              <Input id="name" name="name" required maxLength={60} autoComplete="name" className="h-11 border-white/15 bg-black/20 text-signal-offwhite placeholder:text-signal-offwhite/35" placeholder={t.namePlaceholder} />
            </Field>
          )}
          <Field id="email" label={t.email} required>
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 border-white/15 bg-black/20 text-signal-offwhite placeholder:text-signal-offwhite/35" placeholder={t.emailPlaceholder} />
          </Field>
          <Field id="password" label={t.password} required>
            <PasswordInput id="password" name="password" required minLength={8} autoComplete={isLogin ? 'current-password' : 'new-password'} className="h-11 border-white/15 bg-black/20 text-signal-offwhite placeholder:text-signal-offwhite/35" placeholder={isLogin ? t.loginPasswordPlaceholder : t.registerPasswordPlaceholder} />
          </Field>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
              <SignalLed tone="red" size="sm" className="mt-1.5" /> {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="mt-2 h-11">
            {pending && <Loader2 className="animate-spin" />}
            {isLogin ? t.signIn : t.signUp}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-signal-offwhite/65">
          {isLogin ? t.noAccount : t.haveAccount}
          <Link to={isLogin ? '/register' : '/login'} search={redirect ? { redirect } : {}} className="font-medium text-signal-cyan hover:underline">
            {isLogin ? t.signUp : t.signIn}
          </Link>
        </p>
      </RadioPanel>
    </div>
  )
}

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="gap-1 text-signal-offwhite/80">
        {label}
        {/* Tanda bintang hanya visual; input sudah memakai atribut required untuk screen reader */}
        {required && (
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        )}
      </Label>
      {children}
    </div>
  )
}
