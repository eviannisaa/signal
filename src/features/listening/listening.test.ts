import { describe, expect, it } from 'vitest'

import { LIGHT_MAX_WPM } from '#/lib/morse'
import { DEFAULT_SETTINGS, effectiveWpm, parseListeningSettings, speedLabel } from './listening'

describe('parseListeningSettings', () => {
  it('menerima pengaturan yang valid', () => {
    expect(parseListeningSettings({ wpm: 15, level: 'long', signal: 'light' })).toEqual({ wpm: 15, level: 'long', signal: 'light' })
  })
  it('memakai default untuk nilai kosong atau rusak', () => {
    expect(parseListeningSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseListeningSettings('abc')).toEqual(DEFAULT_SETTINGS)
  })
  it('hanya mengganti field yang tidak valid', () => {
    expect(parseListeningSettings({ wpm: 99, level: 'short', signal: 'video' })).toEqual({ ...DEFAULT_SETTINGS, level: 'short' })
    expect(parseListeningSettings({ wpm: 7.5, signal: 'light' })).toEqual({ ...DEFAULT_SETTINGS, signal: 'light' })
  })
})

describe('effectiveWpm', () => {
  it('membatasi Light Signal', () => {
    expect(effectiveWpm('light', 20)).toBe(LIGHT_MAX_WPM)
    expect(effectiveWpm('light', 5)).toBe(5)
    expect(effectiveWpm('audio', 20)).toBe(20)
  })
})

describe('speedLabel', () => {
  it('memberi label sederhana', () => {
    expect(speedLabel(5, 'id')).toBe('Lambat')
    expect(speedLabel(12, 'id')).toBe('Sedang')
    expect(speedLabel(20, 'id')).toBe('Cepat')
  })
})
