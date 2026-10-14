/** Helper input kode Morse untuk tombol titik, strip, jeda huruf, dan jeda kata. */
export type MorseToken = '.' | '-' | 'letter' | 'word'

export function appendMorse(current: string, token: MorseToken): string {
  if (token === '.' || token === '-') return current + token
  const trimmed = current.trimEnd()
  if (!trimmed || trimmed.endsWith('/')) return current
  if (token === 'letter') return current.endsWith(' ') ? current : `${current} `
  return `${trimmed} / `
}

export function backspaceMorse(current: string): string {
  if (current.endsWith(' / ')) return current.slice(0, -3)
  return current.slice(0, -1)
}
