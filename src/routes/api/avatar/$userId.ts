import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '#/db'
import { user } from '#/db/schema'
import { readSessionUser } from '#/features/auth/server'

/** Menyajikan foto profil milik pengguna yang login. URL memuat versi (?v=), sehingga boleh di-cache lama. */
export const Route = createFileRoute('/api/avatar/$userId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const me = await readSessionUser()
        if (!me || me.id !== params.userId) return new Response('Not found', { status: 404 })
        const row = await db.query.user.findFirst({ where: eq(user.id, me.id), columns: { image: true } })
        const match = row?.image?.match(/^data:(image\/(?:webp|jpeg|png));base64,(.+)$/)
        if (!match) return new Response('Not found', { status: 404 })
        return new Response(Buffer.from(match[2], 'base64'), {
          headers: {
            'Content-Type': match[1],
            'Cache-Control': 'private, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
