import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '#/lib/auth-client'
import { useT } from '#/lib/i18n'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RadioPanel, SignalLed } from '#/components/radio/primitives'
import { LanguageSwitch } from '#/components/radio/LanguageSwitch'
import type { CurrentUser } from '#/features/auth/server'
import { PasswordInput } from '#/features/auth/components/PasswordInput'
import { UserAvatar } from '#/features/auth/components/UserAvatar'
import { accountMessages } from '../messages'
import { MAX_AVATAR_LENGTH, updateAvatar, updateName } from '../server'

const INPUT = 'h-11 border-white/15 bg-black/20 text-signal-offwhite placeholder:text-signal-offwhite/35'
const AVATAR_SIZE = 256
const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Memotong foto menjadi persegi di tengah dan mengecilkannya ke 256×256, lalu mengembalikan data URL WebP (JPEG jika WebP tidak didukung). */
async function toAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', 0.85)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
}

export function AccountSettings({ user }: { user: CurrentUser }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <ProfilePanel user={user} />
      <div className="flex flex-col gap-6">
        <PasswordPanel />
        <LanguagePanel />
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Profil */

function ProfilePanel({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const t = useT(accountMessages).profile
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoPending, setPhotoPending] = useState(false)
  const [name, setName] = useState(user.name)
  const [namePending, setNamePending] = useState(false)
  const trimmed = name.trim()
  const nameChanged = trimmed !== user.name

  async function savePhoto(image: string | null) {
    setPhotoPending(true)
    try {
      await updateAvatar({ data: { image } })
      await router.invalidate()
      toast.success(image ? t.photoUpdated : t.photoRemoved)
    } catch {
      toast.error(image ? t.photoUpdateFailed : t.photoRemoveFailed)
    } finally {
      setPhotoPending(false)
    }
  }

  async function onFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.error(t.photoInvalidType)
    if (file.size > MAX_FILE_BYTES) return toast.error(t.photoTooLarge)
    let image: string
    try {
      image = await toAvatarDataUrl(file)
    } catch {
      return toast.error(t.photoUnreadable)
    }
    if (image.length > MAX_AVATAR_LENGTH) return toast.error(t.photoTooLargeProcessed)
    await savePhoto(image)
  }

  async function onSaveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!trimmed || !nameChanged) return
    setNamePending(true)
    try {
      await updateName({ data: { name: trimmed } })
      await router.invalidate()
      setName(trimmed)
      toast.success(t.nameUpdated)
    } catch {
      toast.error(t.nameUpdateFailed)
    } finally {
      setNamePending(false)
    }
  }

  return (
    <RadioPanel channel="ID" title={t.panelTitle} led={false} bodyClassName="flex flex-col gap-7">
      <div className="flex items-center gap-5">
        <div className="relative">
          <UserAvatar name={user.name} image={user.image} className="size-20 text-2xl ring-1 ring-white/10" />
          {photoPending && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55" aria-hidden="true">
              <Loader2 className="size-5 animate-spin text-signal-offwhite" />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" size="sm" variant="secondary" disabled={photoPending} onClick={() => fileRef.current?.click()}>
              <Camera />
              {user.image ? t.changePhoto : t.uploadPhoto}
            </Button>
            {user.image && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={photoPending}
                onClick={() => savePhoto(null)}
                className="text-signal-offwhite/70 hover:bg-white/[0.06] hover:text-signal-offwhite"
              >
                <Trash2 />
                {t.removePhoto}
              </Button>
            )}
          </div>
          <p className="text-xs text-signal-offwhite/50">{t.photoHint}</p>
        </div>
      </div>

      <form onSubmit={onSaveName} className="flex flex-col gap-4 border-t border-white/[0.07] pt-6">
        <Field id="name" label={t.name} required>
          <Input id="name" name="name" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder={t.namePlaceholder} />
        </Field>
        <Field id="email" label={t.email} hint={t.emailHint}>
          <Input id="email" value={user.email} readOnly disabled className={INPUT} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={!trimmed || !nameChanged || namePending}>
            {namePending && <Loader2 className="animate-spin" />}
            {t.saveName}
          </Button>
        </div>
      </form>
    </RadioPanel>
  )
}

/* -------------------------------------------------------------- Password */

function PasswordPanel() {
  const t = useT(accountMessages).password
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const currentPassword = String(form.get('currentPassword') ?? '')
    const newPassword = String(form.get('newPassword') ?? '')
    const confirm = String(form.get('confirmPassword') ?? '')
    if (newPassword.length < 8) return setError(t.errors.tooShort)
    if (newPassword !== confirm) return setError(t.errors.mismatch)
    if (newPassword === currentPassword) return setError(t.errors.sameAsCurrent)

    setPending(true)
    setError(null)
    const res = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    setPending(false)
    if (res.error) {
      const code = res.error.code ?? ''
      setError(
        code.includes('INVALID_PASSWORD')
          ? t.errors.invalidCurrent
          : code.includes('PASSWORD_TOO_SHORT')
            ? t.errors.tooShort
            : code.includes('PASSWORD_TOO_LONG')
              ? t.errors.tooLong
              : t.errors.generic,
      )
      return
    }
    formRef.current?.reset()
    toast.success(t.success)
  }

  return (
    <RadioPanel channel="SEC" title={t.panelTitle} led={pending ? 'blink' : false}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{t.heading}</h2>
        <p className="mt-1 text-sm text-signal-offwhite/60">{t.intro}</p>
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field id="currentPassword" label={t.current} required>
          <PasswordInput id="currentPassword" name="currentPassword" required autoComplete="current-password" className={INPUT} placeholder={t.currentPlaceholder} />
        </Field>
        <Field id="newPassword" label={t.next} required>
          <PasswordInput id="newPassword" name="newPassword" required minLength={8} autoComplete="new-password" className={INPUT} placeholder={t.nextPlaceholder} />
        </Field>
        <Field id="confirmPassword" label={t.confirm} required>
          <PasswordInput id="confirmPassword" name="confirmPassword" required minLength={8} autoComplete="new-password" className={INPUT} placeholder={t.confirmPlaceholder} />
        </Field>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            <SignalLed tone="red" size="sm" className="mt-1.5" /> {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t.submit}
          </Button>
        </div>
      </form>
    </RadioPanel>
  )
}

/* ---------------------------------------------------------------- Bahasa */

function LanguagePanel() {
  const t = useT(accountMessages).language
  return (
    <RadioPanel channel="LANG" title={t.panelTitle} led={false}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t.heading}</h2>
          <p className="mt-1 text-sm text-signal-offwhite/60">{t.hint}</p>
        </div>
        <LanguageSwitch />
      </div>
    </RadioPanel>
  )
}

/* ----------------------------------------------------------------- Field */

function Field({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="gap-1 text-signal-offwhite/80">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-400">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <p className="text-xs text-signal-offwhite/45">{hint}</p>}
    </div>
  )
}
