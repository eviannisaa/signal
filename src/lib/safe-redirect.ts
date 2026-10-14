/** Hanya path internal yang boleh dipakai sebagai tujuan redirect agar tidak menjadi open redirect. */
export function safeRedirect(target: unknown, fallback = '/learn'): string {
  if (typeof target !== 'string') return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback
  return target
}
