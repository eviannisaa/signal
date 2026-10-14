import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export interface CurrentUser {
  id: string
  name: string
  email: string
  /** URL foto profil (lewat /api/avatar), atau null jika belum diunggah. */
  image: string | null
}

/** Foto profil disimpan sebagai data URL di user.image. URL-nya memuat versi agar cache browser diperbarui setelah diganti. */
export function avatarUrl(userId: string, image: string | null | undefined, updatedAt: Date): string | null {
  return image?.startsWith('data:image/') ? `/api/avatar/${userId}?v=${updatedAt.getTime()}` : null
}

/**
 * Mengambil user dari session aktif. user_id tidak pernah diambil dari input client.
 * Hanya berjalan di server; lib/auth (dan database) di-import secara dinamis agar
 * tidak ikut ke bundle browser.
 */
export const readSessionUser = createServerOnlyFn(async (): Promise<CurrentUser | null> => {
  const { auth } = await import('#/lib/auth')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const { id, name, email, image, updatedAt } = session.user
  return { id, name, email, image: avatarUrl(id, image, new Date(updatedAt)) }
})

/** Dipanggil di awal setiap Server Function area private. */
export const requireUser = createServerOnlyFn(async (): Promise<CurrentUser> => {
  const user = await readSessionUser()
  if (!user) throw new Response('Unauthorized', { status: 401 })
  return user
})

/** Context root untuk setiap navigasi: user dan bahasa dalam satu panggilan server. */
export const getRootContext = createServerFn({ method: 'GET' }).handler(async () => {
  const { readLocale } = await import('#/lib/i18n/server')
  return { user: await readSessionUser(), locale: readLocale() }
})
