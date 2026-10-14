import { MORSE_TABLE } from './morse'

/** Simpul pohon Morse: cabang kiri untuk dot, cabang kanan untuk dash. */
export interface MorseNode {
  code: string
  char: string | null
  depth: number
  /** Posisi horizontal 0..1 di dalam lebar pohon. */
  x: number
}

/** Membuat pohon Morse otomatis dari tabel kode hingga kedalaman tertentu. */
export function buildMorseTree(maxDepth = 4): MorseNode[] {
  const byCode: Record<string, string> = {}
  for (const [char, code] of Object.entries(MORSE_TABLE)) {
    if (/[A-Z]/.test(char)) byCode[code] = char
  }
  const nodes: MorseNode[] = []
  const walk = (code: string) => {
    const depth = code.length
    let index = 0
    for (const sym of code) index = index * 2 + (sym === '-' ? 1 : 0)
    const x = depth === 0 ? 0.5 : (index + 0.5) / 2 ** depth
    nodes.push({ code, char: depth === 0 ? null : (byCode[code] ?? null), depth, x })
    if (depth < maxDepth) {
      walk(code + '.')
      walk(code + '-')
    }
  }
  walk('')
  return nodes
}

/** Kode setiap simpul pada jalur dari akar ke kode tujuan, misalnya "-." menjadi ["", "-", "-."]. */
export function pathTo(code: string): string[] {
  const out = ['']
  for (let i = 1; i <= code.length; i++) out.push(code.slice(0, i))
  return out
}
