import { DEFAULT_FREQUENCY, DEFAULT_WPM, toTimings, totalUnits, unitMs } from './morse'

/** tone: nada radio (sidetone). sounder: nada yang sama ditambah klik-klak mesin telegraf kawat. */
export type KeyVoice = 'tone' | 'sounder'

export interface PlayOptions {
  wpm?: number
  frequency?: number
  voice?: KeyVoice
  /** false untuk Light Signal: penjadwal yang sama tanpa bunyi. */
  sound?: boolean
  onToggle?: (on: boolean, symbol?: '.' | '-') => void
  /** Posisi pemutaran 0..1 untuk playhead. */
  onProgress?: (fraction: number) => void
  onEnd?: () => void
}

export interface MorsePlayback {
  stop: () => void
  durationMs: number
}

let sharedContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedContext ??= new Ctor()
  if (sharedContext.state === 'suspended') void sharedContext.resume()
  return sharedContext
}

let noiseBuffer: AudioBuffer | null = null

function getNoise(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer?.sampleRate === ctx.sampleRate) return noiseBuffer
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

/**
 * Bunyi armature sounder telegraf. "down" adalah klak keras saat tuas tertarik,
 * "up" adalah klik lebih ringan saat tuas kembali. Nada dibentuk dari noise yang
 * difilter ditambah dentum pendek pada "down".
 */
function scheduleClick(ctx: AudioContext, at: number, kind: 'down' | 'up', out: AudioNode = ctx.destination) {
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = kind === 'down' ? 2400 : 1500
  filter.Q.value = 1.2
  const gain = ctx.createGain()
  const peak = kind === 'down' ? 0.9 : 0.45
  const decay = kind === 'down' ? 0.035 : 0.022
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(peak, at + 0.001)
  gain.gain.exponentialRampToValueAtTime(0.001, at + decay)
  src.connect(filter).connect(gain).connect(out)
  src.start(at)
  src.stop(at + decay + 0.01)

  if (kind === 'down') {
    const thump = ctx.createOscillator()
    const tg = ctx.createGain()
    thump.frequency.setValueAtTime(190, at)
    thump.frequency.exponentialRampToValueAtTime(90, at + 0.04)
    tg.gain.setValueAtTime(0.35, at)
    tg.gain.exponentialRampToValueAtTime(0.001, at + 0.05)
    thump.connect(tg).connect(out)
    thump.start(at)
    thump.stop(at + 0.06)
  }
}

export interface KeySound {
  down: () => void
  up: () => void
  dispose: () => void
}

/** Volume nada saat sounder aktif, lebih pelan agar klik tetap terdengar. */
const TONE_GAIN = 0.22
const TONE_GAIN_UNDER_CLICKS = 0.14

/**
 * Bunyi langsung untuk kunci telegraf yang ditekan pengguna. Nada selalu berbunyi
 * selama kunci ditekan agar panjang-pendeknya terdengar; sounder menambahkan klik.
 * Oscillator dibuat sekali dan hanya gain-nya yang dibuka-tutup agar latensinya rendah.
 * Harus dibuat atau dipakai pertama kali setelah interaksi pengguna.
 */
export function createKeySound(voice: KeyVoice, frequency = DEFAULT_FREQUENCY): KeySound {
  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null

  function toneNodes(ctx: AudioContext) {
    if (!osc || !gain) {
      osc = ctx.createOscillator()
      gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.value = 0
      osc.connect(gain).connect(ctx.destination)
      osc.start()
    }
    return gain
  }

  return {
    down() {
      const ctx = getContext()
      if (!ctx) return
      if (voice === 'sounder') scheduleClick(ctx, ctx.currentTime, 'down')
      const g = toneNodes(ctx)
      g.gain.cancelScheduledValues(ctx.currentTime)
      g.gain.setTargetAtTime(voice === 'sounder' ? TONE_GAIN_UNDER_CLICKS : TONE_GAIN, ctx.currentTime, 0.004)
    },
    up() {
      const ctx = getContext()
      if (!ctx) return
      if (voice === 'sounder') scheduleClick(ctx, ctx.currentTime, 'up')
      if (!gain) return
      gain.gain.cancelScheduledValues(ctx.currentTime)
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.004)
    },
    dispose() {
      try {
        osc?.stop()
      } catch {
        // Oscillator sudah berhenti
      }
      osc?.disconnect()
      osc = null
      gain = null
    },
  }
}

/**
 * Memutar kode Morse. Bunyi dijadwalkan dengan Web Audio API, sedangkan callback
 * onToggle dan onProgress memakai timer yang sama sehingga LED, lampu, dan playhead
 * selalu sinkron dengan bunyi. Harus dipanggil setelah interaksi pengguna.
 */
export function playMorse(code: string, options: PlayOptions = {}): MorsePlayback {
  const { wpm = DEFAULT_WPM, frequency = DEFAULT_FREQUENCY, voice = 'tone', sound = true, onToggle, onProgress, onEnd } = options
  const unit = unitMs(wpm)
  const timings = toTimings(code)
  const durationMs = totalUnits(timings) * unit
  const timers: ReturnType<typeof setTimeout>[] = []
  let raf = 0
  let stopped = false

  let osc: OscillatorNode | null = null
  let gain: GainNode | null = null
  const ctx = sound ? getContext() : null
  if (ctx) {
    // Nada dan klik lewat satu bus agar semuanya bisa dibungkam saat stop()
    gain = ctx.createGain()
    gain.connect(ctx.destination)
    const bus = gain
    const tone = ctx.createGain()
    osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = frequency
    tone.gain.value = 0
    osc.connect(tone).connect(bus)
    const level = voice === 'sounder' ? TONE_GAIN_UNDER_CLICKS : TONE_GAIN
    const t0 = ctx.currentTime + 0.05
    let at = 0
    for (const t of timings) {
      const start = t0 + at / 1000
      const end = start + (t.units * unit) / 1000
      if (t.on) {
        // Ramp singkat agar nada tidak terdengar "klik"
        tone.gain.setTargetAtTime(level, start, 0.004)
        tone.gain.setTargetAtTime(0, end, 0.004)
        if (voice === 'sounder') {
          scheduleClick(ctx, start, 'down', bus)
          scheduleClick(ctx, end, 'up', bus)
        }
      }
      at += t.units * unit
    }
    osc.start(t0)
    osc.stop(t0 + durationMs / 1000 + 0.15)
  }

  let at = 0
  for (const t of timings) {
    const on = t.on
    const symbol = t.symbol
    timers.push(setTimeout(() => !stopped && onToggle?.(on, symbol), at + (ctx ? 50 : 0)))
    at += t.units * unit
  }
  timers.push(
    setTimeout(() => {
      if (stopped) return
      onToggle?.(false)
      onProgress?.(1)
      cancelAnimationFrame(raf)
      onEnd?.()
    }, durationMs + (ctx ? 60 : 0)),
  )

  if (onProgress && typeof requestAnimationFrame !== 'undefined') {
    const started = performance.now() + (ctx ? 50 : 0)
    const tick = () => {
      if (stopped) return
      const f = Math.min(1, Math.max(0, (performance.now() - started) / durationMs))
      onProgress(f)
      if (f < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  return {
    durationMs,
    stop() {
      if (stopped) return
      stopped = true
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      try {
        if (gain && ctx) gain.gain.cancelScheduledValues(ctx.currentTime), gain.gain.setValueAtTime(0, ctx.currentTime)
        osc?.stop()
      } catch {
        // Oscillator sudah berhenti
      }
      onToggle?.(false)
    },
  }
}
