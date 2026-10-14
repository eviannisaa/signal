import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { user } from '#/db/schema'
import { requireUser } from '#/features/auth/server'

/** Batas panjang data URL foto (sekitar 220 KB gambar). Browser sudah mengecilkan foto ke 256×256 sebelum dikirim. */
export const MAX_AVATAR_LENGTH = 300_000

const nameInput = z.object({ name: z.string().trim().min(1).max(60) })
const imageInput = z.object({
  image: z
    .string()
    .max(MAX_AVATAR_LENGTH)
    .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/)
    .nullable(),
})

/** Mengganti nama pengguna yang login. */
export const updateName = createServerFn({ method: 'POST' })
  .inputValidator(nameInput)
  .handler(async ({ data }) => {
    const me = await requireUser()
    await db.update(user).set({ name: data.name }).where(eq(user.id, me.id))
    return { name: data.name }
  })

/** Mengganti atau menghapus (null) foto profil pengguna yang login. */
export const updateAvatar = createServerFn({ method: 'POST' })
  .inputValidator(imageInput)
  .handler(async ({ data }) => {
    const me = await requireUser()
    await db.update(user).set({ image: data.image }).where(eq(user.id, me.id))
    return { ok: true }
  })
