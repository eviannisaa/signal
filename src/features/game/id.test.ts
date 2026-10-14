import { describe, expect, it } from 'vitest'

import { generateGameId, isValidGameId, parseGameInput } from './id'

describe('generateGameId', () => {
  it('menghasilkan 12 karakter base62', () => {
    for (let i = 0; i < 200; i++) {
      const id = generateGameId()
      expect(id).toMatch(/^[A-Za-z0-9]{12}$/)
      expect(isValidGameId(id)).toBe(true)
    }
  })

  it('tidak menghasilkan ID yang sama dalam banyak percobaan', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => generateGameId()))
    expect(ids.size).toBe(2000)
  })

  it('membuang byte di atas batas agar tidak bias', () => {
    // Byte 255 dan 248 dibuang, byte 0 menjadi "A", byte 61 menjadi "9"
    let call = 0
    const fake = (buf: Uint8Array) => {
      if (call++ === 0) {
        buf.fill(255)
        buf[0] = 248
        buf[1] = 61
      } else {
        buf.fill(0)
      }
      return buf
    }
    expect(generateGameId(fake)).toBe('9AAAAAAAAAAA')
  })
})

describe('isValidGameId', () => {
  it('menerima tepat 12 karakter alfanumerik', () => {
    expect(isValidGameId('k7Qm2xPa9TbZ')).toBe(true)
  })

  it.each(['abc', 'k7Qm2xPa9TbZ1', 'k7Qm2xPa9Tb-', 'k7Qm2xPa9Tb ', '', 'k7Qm2xPa9Tbé'])('menolak %j', (id) => {
    expect(isValidGameId(id)).toBe(false)
  })

  it('menolak nilai selain string', () => {
    expect(isValidGameId(123)).toBe(false)
    expect(isValidGameId(null)).toBe(false)
  })
})

describe('parseGameInput', () => {
  it('menerima kode langsung', () => {
    expect(parseGameInput('  k7Qm2xPa9TbZ ')).toBe('k7Qm2xPa9TbZ')
  })

  it('mengambil ID dari link lengkap atau path', () => {
    expect(parseGameInput('https://signal.app/g/k7Qm2xPa9TbZ')).toBe('k7Qm2xPa9TbZ')
    expect(parseGameInput('http://localhost:3000/g/k7Qm2xPa9TbZ?x=1')).toBe('k7Qm2xPa9TbZ')
    expect(parseGameInput('/g/k7Qm2xPa9TbZ/')).toBe('k7Qm2xPa9TbZ')
  })

  it('mengembalikan null untuk input tidak valid', () => {
    expect(parseGameInput('')).toBeNull()
    expect(parseGameInput('https://signal.app/g/abc')).toBeNull()
    expect(parseGameInput('https://signal.app/x/k7Qm2xPa9TbZ1')).toBeNull()
    expect(parseGameInput('halo dunia')).toBeNull()
  })
})
