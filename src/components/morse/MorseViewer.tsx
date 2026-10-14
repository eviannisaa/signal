import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Pause,
  Play,
  Square,
  Volume2,
} from 'lucide-react'

import { cn } from '#/lib/utils'
import {
  DEFAULT_FREQUENCY,
  DEFAULT_WPM,
  LIGHT_MAX_WPM,
  EYE_MAX_WPM,
  MORSE_TABLE,
  MORSE_VIEW_LABELS,
  VIEWER_TABS,
  encode,
  lettersOf,
  looksLikeMorse,
  normalizeMorse,
  toDitDah,
  toSpoken,
  toTimings,
  totalUnits,
} from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { buildMorseTree, pathTo } from '#/lib/morse-tree'
import { TelegraphKey } from '#/features/telegraph/components/TelegraphKey'
import { useLocale, useT } from '#/lib/i18n'
import { viewerMessages } from './messages'
import { useMorsePlayer, usePrefersReducedMotion } from './use-morse-player'

export type MorseViewerMode = 'learn' | 'question'

export interface MorseViewerProps {
  /** Satu karakter, teks, atau kode Morse (di game, browser hanya menerima kode). */
  value: string
  view: MorseView
  mode?: MorseViewerMode
  /** Tampilan ringkas untuk tabel lesson. */
  compact?: boolean
  onViewChange?: (view: MorseView) => void
  /** Sembunyikan tab jika tampilan ditentukan dari luar (misalnya soal Tantangan). */
  hideTabs?: boolean
  wpm?: number
  className?: string
}

const CODE_TO_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([c, k]) => [k, c]),
)

/** Komponen bersama untuk representasi Morse. Tab menampilkan VIEWER_TABS; tampilan lain tetap bisa dipakai lewat hideTabs. */
export function MorseViewer({
  value,
  view,
  mode = 'learn',
  compact,
  onViewChange,
  hideTabs,
  wpm = DEFAULT_WPM,
  className,
}: MorseViewerProps) {
  const msg = useT(viewerMessages)
  const isCode = looksLikeMorse(value)
  const code = isCode ? normalizeMorse(value) : encode(value)
  const plain = isCode ? '' : value.toUpperCase()
  const showAnswer = mode === 'learn' && !!plain
  const reduced = usePrefersReducedMotion()
  // Dengan tab terlihat, tampilan yang disembunyikan dari tab (misalnya pilihan tersimpan lama) diganti Audio Signal
  const shown: MorseView =
    hideTabs || (VIEWER_TABS as readonly MorseView[]).includes(view)
      ? view
      : 'audio'
  // Tampilan berkedip diganti Signal Timeline jika pengguna memilih kurangi gerakan
  const flashing = shown === 'light' || shown === 'helio' || shown === 'mirror'
  const effective: MorseView = flashing && reduced ? 'timeline' : shown

  return (
    <div className={cn('radio-panel flex flex-col overflow-hidden', className)}>
      {!hideTabs && (
        <div className="border-b border-white/10 p-2">
          {/* Pemilih tampilan seperti pemilih arah di Translator: segmen bernomor kanal, aktif terisi */}
          <div
            role="tablist"
            aria-label={msg.tabsLabel}
            className="flex w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-1"
          >
            {VIEWER_TABS.map((v, i) => {
              const active = shown === v
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={MORSE_VIEW_LABELS[v]}
                  onClick={() => onViewChange?.(v)}
                  className={cn(
                    'flex flex-1 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan',
                    active
                      ? 'bg-white/10 text-signal-offwhite ring-1 ring-white/10'
                      : 'text-signal-offwhite/55 hover:text-signal-offwhite',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'text-[10px]',
                      active ? 'text-signal-cyan' : 'text-signal-offwhite/35',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {MORSE_VIEW_LABELS[v].replace(/ Signal$/, '')}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div
        role="tabpanel"
        className={cn(
          'flex min-h-40 flex-1 flex-col justify-center',
          compact ? 'p-4' : 'p-5 sm:p-6',
        )}
      >
        {!code ? (
          <p className="text-sm text-signal-offwhite/60">
            {msg.noCode}
          </p>
        ) : (
          <>
            {effective === 'audio' && <AudioSignalView code={code} wpm={wpm} />}
            {effective === 'light' && <LightSignalView code={code} wpm={wpm} />}
            {effective === 'eye' && <EyeSignalView code={code} wpm={wpm} />}
            {effective === 'helio' && <HeliographView code={code} wpm={wpm} />}
            {effective === 'grass' && <GrassCipherView code={code} wpm={wpm} />}
            {effective === 'mirror' && (
              <SignalMirrorView code={code} wpm={wpm} />
            )}
            {effective === 'timeline' && (
              <SignalTimelineView code={code} plain={showAnswer ? plain : ''} />
            )}
            {effective === 'chart' && (
              <MorseChartView code={code} showAnswer={showAnswer} />
            )}
            {effective === 'text' && (
              <DotDashTextView
                code={code}
                plain={showAnswer ? plain : ''}
                compact={compact}
              />
            )}
            {effective === 'flag' && <FlagSignalView code={code} />}
            {flashing && reduced && (
              <p className="mt-3 text-xs text-signal-offwhite/55">
                {msg.reducedMotion(MORSE_VIEW_LABELS[shown])}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PlayButton({
  playing,
  onClick,
  label,
}: {
  playing: boolean
  onClick: () => void
  label: string
}) {
  const msg = useT(viewerMessages)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? msg.stop : label}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-signal-blue text-signal-offwhite transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan"
    >
      {playing ? (
        <Pause className="size-5" />
      ) : (
        <Play className="ml-0.5 size-5" />
      )}
    </button>
  )
}

/** Baris kontrol yang sama untuk semua tampilan beranimasi: putar, stop, lalu keterangan. */
function Controls({
  playing,
  label,
  onToggle,
  onStop,
  className,
  children,
}: {
  playing: boolean
  label: string
  onToggle: () => void
  onStop: () => void
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn('flex w-full items-center gap-3', className)}>
      <PlayButton playing={playing} label={label} onClick={onToggle} />
      <StopButton disabled={!playing} onClick={onStop} />
      {/* Spesifikasi sinyal rata kanan, kecil dan redup seperti frekuensi di kartu Game */}
      {children && (
        <span className="radio-label ml-auto flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-right text-signal-offwhite/45 tabular-nums">
          {children}
        </span>
      )}
    </div>
  )
}

/**
 * Tata letak bersama Audio, Light, dan Flag Signal: objek selalu di kolom kiri, kontrol di kolom kanan,
 * juga di layar sempit. Kolom objek berukuran tetap dan lebih sempit; sisa lebar untuk kontrol. Karena
 * lebarnya tetap, posisi tombol tidak bergeser saat berganti tab atau huruf. Tinggi kolom mengikuti isinya
 * agar kartu tidak terlalu tinggi.
 */
function PlayerGrid({
  controls,
  children,
}: {
  controls: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 sm:gap-8">
      {/* Area visual berukuran tetap agar posisi kontrol tidak bergeser saat berganti tab */}
      <div className="relative flex h-28 w-36 items-center justify-center sm:h-32 sm:w-48">
        {children}
      </div>
      <div className="flex min-w-0 justify-start [&>*]:w-full">{controls}</div>
    </div>
  )
}

function StopButton({
  disabled,
  onClick,
}: {
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Stop"
      className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-signal-offwhite transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan disabled:opacity-40"
    >
      <Square className="size-4 fill-current" />
    </button>
  )
}

/* ------------------------------------------------------------ Audio Signal */

/** Indeks simbol (urutan nada) yang sedang berbunyi berdasarkan posisi pemutaran, atau null saat jeda. */
function activeToneIndex(code: string, progress: number | null): number | null {
  if (progress === null) return null
  const timings = toTimings(code)
  const at = progress * totalUnits(timings)
  let elapsed = 0
  let tone = -1
  for (const t of timings) {
    if (t.on) tone++
    if (at < elapsed + t.units) return t.on ? tone : null
    elapsed += t.units
  }
  return null
}

function AudioSignalView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  useEffect(() => p.stop, [code, p.stop])
  const active = activeToneIndex(code, p.progress)
  const words = normalizeMorse(code)
    .split(' / ')
    .filter(Boolean)
    .map((w) => w.split(' ').filter(Boolean))
  let toneIndex = 0

  // Simbol yang menyala mengikuti nada di kiri, kontrol di kanan
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.playSound}
          onToggle={() => (p.playing ? p.stop() : p.play(code, { wpm }))}
          onStop={p.stop}
          className="flex-wrap"
        >
          <Volume2
            className={cn(
              'size-4 transition-colors duration-75',
              p.on &&
                (p.symbol === '-' ? 'text-signal-blue' : 'text-signal-cyan'),
            )}
            aria-hidden="true"
          />
          <span className="inline-flex items-center whitespace-nowrap">
            <span>{DEFAULT_FREQUENCY} Hz</span>
            <span className="ml-4 inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              {wpm} WPM
            </span>
          </span>
        </Controls>
      }
    >
      {/* Penulisan Morse pada umumnya: "/" di antara huruf dan "//" di antara kata, rata tengah */}
      <span
        className="flex w-full min-w-0 flex-wrap items-center justify-center gap-x-1.5 gap-y-1.5"
        aria-hidden="true"
      >
        {words.map((word, wi) =>
          word.map((letter, li) => {
            // Pemisah ikut huruf sebelumnya agar garis miring tidak pernah membuka baris baru
            const sep =
              li < word.length - 1 ? '/' : wi < words.length - 1 ? '//' : ''
            return (
              <span
                key={`${wi}-${li}`}
                className="inline-flex items-center gap-1.5"
              >
                <span className="inline-flex items-center gap-1">
                  {Array.from(letter).map((sym, si) => {
                    const lit = active === toneIndex++
                    return (
                      <span
                        key={si}
                        className={cn(
                          'h-1.5 rounded-full transition-[transform,box-shadow] duration-75',
                          sym === '.'
                            ? 'w-1.5 bg-morse-dot'
                            : 'w-4.5 bg-morse-dash',
                          lit && 'scale-125',
                        )}
                        style={
                          lit
                            ? {
                                boxShadow: `0 0 6px 1px ${sym === '.' ? '#06B6D4' : '#2563EB'}`,
                              }
                            : undefined
                        }
                      />
                    )
                  })}
                </span>
                {sep && (
                  <span className="font-mono text-xs text-signal-offwhite/35">
                    {sep}
                  </span>
                )}
              </span>
            )
          }),
        )}
      </span>
    </PlayerGrid>
  )
}

/* ------------------------------------------------------------ Light Signal */

function LightSignalView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  const speed = Math.min(wpm, LIGHT_MAX_WPM)
  useEffect(() => p.stop, [code, p.stop])
  const color = p.symbol === '-' ? '#2563EB' : '#06B6D4'
  // Lampu Aldis di kiri, kontrol di kanan. Kecepatan dibatasi agar maksimal 3 kedipan per detik.
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.lightOn}
          onToggle={() =>
            p.playing ? p.stop() : p.play(code, { wpm: speed, sound: false })
          }
          onStop={p.stop}
          className="flex-wrap"
        >
          {/* Indikator memudar mengikuti kedipan; teks hanya berganti saat mulai atau berhenti agar tidak berkedip */}
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150 ease-out"
            style={{
              background: p.on ? color : 'rgb(148 163 184 / 0.3)',
              boxShadow: p.on ? `0 0 8px 1px ${color}` : 'none',
            }}
          />
          <span
            className="inline-flex items-center whitespace-nowrap"
            title={msg.maxBlinks}
          >
            <span>{p.playing ? 'On air' : 'Standby'}</span>
            <span className="ml-4 inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              {speed} WPM
            </span>
          </span>
        </Controls>
      }
    >
      <SignalLamp
        on={p.on}
        className="h-18 w-auto shrink-0 translate-x-3 sm:h-24 sm:translate-x-4"
      />
      <p className="sr-only" aria-live="polite">
        {p.playing ? msg.lampBlinking : ''}
      </p>
    </PlayerGrid>
  )
}

/* ----------------------------------------------------------- Grass Cipher */

/** Ukuran bukit gelombang Grass Cipher (koordinat viewBox = piksel): titik rendah, strip tinggi. */
const GRASS = {
  dot: { w: 16, h: 12 },
  dash: { w: 22, h: 34 },
  /** Garis datar di antara huruf. */
  letterGap: 14,
  /** Ujung garis di awal dan akhir setiap kata. */
  stub: 6,
  base: 42,
  height: 50,
}

/** Satu bukit gelombang dari (x, base) ke (x + w, base) dengan puncak setinggi h. */
function grassHump(x: number, w: number, h: number) {
  const b = GRASS.base
  const k = (h * 4) / 3
  return `M${x},${b} C${x + w * 0.3},${b - k} ${x + w * 0.7},${b - k} ${x + w},${b}`
}

/**
 * Grass Cipher (sandi rumput ala Pramuka) dalam bentuk gelombang: satu garis bersambung, titik menjadi bukit
 * rendah dan strip menjadi bukit tinggi. Simbol dalam satu huruf saling menyambung, antarhuruf dipisah garis
 * datar. Saat diputar, simbol yang berbunyi menyala dan yang belum dilewati tampil redup.
 */
function GrassCipherView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  useEffect(() => p.stop, [code, p.stop])
  const active = activeToneIndex(code, p.progress)
  const words = normalizeMorse(code)
    .split(' / ')
    .filter(Boolean)
    .map((w) => w.split(' ').filter(Boolean))
  let toneIndex = 0

  // Gelombang di kiri, kontrol di kanan
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.playCipher}
          onToggle={() => (p.playing ? p.stop() : p.play(code, { wpm }))}
          onStop={p.stop}
          className="flex-wrap"
        >
          <span className="inline-flex items-center whitespace-nowrap">
            <span className="text-signal-cyan">{msg.grassLow}</span>
            {msg.grassDot}
            <span className="text-signal-blue">{msg.grassHigh}</span>
            {msg.grassDash}
          </span>
        </Controls>
      }
    >
      <span
        role="img"
        aria-label={`Grass Cipher: ${toDitDah(code)}`}
        className="inline-flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-2"
      >
        {words.map((word, wi) => {
          const humps: { d: string; symbol: '.' | '-'; tone: number }[] = []
          let flat = `M0,${GRASS.base} H${GRASS.stub}`
          let x = GRASS.stub
          word.forEach((letter, li) => {
            if (li > 0) {
              flat += ` M${x},${GRASS.base} H${x + GRASS.letterGap}`
              x += GRASS.letterGap
            }
            for (const sym of letter) {
              const size = sym === '.' ? GRASS.dot : GRASS.dash
              humps.push({
                d: grassHump(x, size.w, size.h),
                symbol: sym as '.' | '-',
                tone: toneIndex++,
              })
              x += size.w
            }
          })
          flat += ` M${x},${GRASS.base} H${x + GRASS.stub}`
          const W = x + GRASS.stub

          return (
            <svg
              key={wi}
              viewBox={`0 0 ${W} ${GRASS.height}`}
              style={{ width: W, maxWidth: '100%' }}
              className="h-auto overflow-visible"
              aria-hidden="true"
            >
              <path
                d={flat}
                fill="none"
                stroke="#F8FAFC"
                strokeOpacity="0.35"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {humps.map((h) => {
                const color = h.symbol === '.' ? '#06B6D4' : '#2563EB'
                const lit = active === h.tone
                // Saat diputar, bukit yang belum dilewati tampil redup
                const ahead =
                  p.playing && (active === null ? false : h.tone > active)
                return (
                  <path
                    key={h.tone}
                    d={h.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={lit ? 3.5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={ahead ? 0.3 : 1}
                    className="transition-[opacity,stroke-width] duration-75"
                    style={
                      lit
                        ? { filter: `drop-shadow(0 0 4px ${color})` }
                        : undefined
                    }
                  />
                )
              })}
            </svg>
          )
        })}
      </span>
    </PlayerGrid>
  )
}

/* ----------------------------------------------------------- Mirror Signal */

/**
 * Cermin sinyal dilihat dari penerima di puncak bukit: pengirim di lembah menghadapkan cermin ke bawah saat
 * jeda, lalu mengarahkannya ke penerima sebentar untuk titik dan lebih lama untuk strip. Kecepatan dibatasi
 * seperti Light Signal agar maksimal 3 kilatan per detik.
 */
function SignalMirrorView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  const speed = Math.min(wpm, LIGHT_MAX_WPM)
  useEffect(() => p.stop, [code, p.stop])
  const color = p.symbol === '-' ? '#2563EB' : '#06B6D4'
  // Pemandangan di kiri, kontrol di kanan
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.watchFlashes}
          onToggle={() =>
            p.playing ? p.stop() : p.play(code, { wpm: speed, sound: false })
          }
          onStop={p.stop}
          className="flex-wrap"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150 ease-out"
            style={{
              background: p.on ? color : 'rgb(148 163 184 / 0.3)',
              boxShadow: p.on ? `0 0 8px 1px ${color}` : 'none',
            }}
          />
          <span
            className="inline-flex items-center whitespace-nowrap"
            title={msg.maxFlashes}
          >
            <span>{p.playing ? 'On air' : 'Standby'}</span>
            <span className="ml-4 inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              {speed} WPM
            </span>
          </span>
        </Controls>
      }
    >
      <SignalMirrorScene on={p.on} className="absolute inset-0 size-full" />
      <p className="sr-only" aria-live="polite">
        {p.playing ? msg.mirrorFlashing : ''}
      </p>
    </PlayerGrid>
  )
}

/** Latar Mirror Signal: lembah berhutan dilihat dari puncak, dengan matahari dan berkas sinarnya. */
const MIRROR_BACKDROP = '/images/signal-mirror-lembah.svg'

/** Titik pusat kaki figur (koordinat figur sama seperti FlagSignaller). */
const PERSON_FOOT = { x: 64, y: 196 }
/** Tengah cermin di dekat mata kiri pengirim (sisi kanan layar), dalam koordinat FlagSignaller (tengah badan x = 80). */
const MIRROR_AT_EYE = { x: 88, y: 32 }

/**
 * Geometri Mirror Signal di atas latar (koordinat viewBox 240×170, latar mengisi penuh). Kamera adalah mata
 * penerima di puncak bukit; pengirim jauh di bawah di tanah lapang yang tersinari, menghadap penerima.
 * Matahari sore ada di belakang penerima di sebelah kiri (di luar bingkai), sesuai bayangan pohon di latar
 * yang jatuh ke kanan atas. Bagi pengirim, matahari dan penerima sama-sama di depannya, sudutnya kecil
 * (±35°): cermin hampir tegak menghadap penerima dan kilatannya paling kuat.
 */
const MIRROR_SCENE = (() => {
  // Pemandangan setinggi Flag Signal (lebih kecil dari lebar kolom penuh); pengirim dan kilatan diperbesar
  // dengan faktor yang sama agar ukurannya di layar tidak ikut mengecil
  const boost = 1.12
  const sender = { x: 162, y: 81, s: 0.07 * boost }
  const glint = {
    x: sender.x + (MIRROR_AT_EYE.x - 80) * sender.s,
    y: sender.y + (MIRROR_AT_EYE.y - PERSON_FOOT.y) * sender.s,
  }
  return { sender, glint, boost }
})()

/**
 * Pengirim dengan gaya figur Flag Signal, menghadap penerima (kamera) dan disinari matahari dari depan. Cermin
 * dipegang di dekat mata untuk membidik lewat lubang bidik; tangan satunya terjulur ke penerima dengan dua jari
 * membentuk V sebagai pemandu bidikan. Saat memancar muka cermin hampir tegak menghadap penerima, sedikit
 * menengadah dan condong ke arah matahari (kiri layar); saat jeda cermin ditundukkan. Bayangan jatuh menjauhi
 * matahari, ke kanan atas layar, searah bayangan pohon di latar.
 */
function MirrorSender({ on }: { on: boolean }) {
  const skin = '#e3cbb5'
  const m = MIRROR_AT_EYE
  return (
    <g transform={`translate(${PERSON_FOOT.x - 80} 0)`}>
      {/* Bayangan menjauhi matahari: menjauh dari kamera ke kanan atas, searah bayangan pohon */}
      <path
        d="M58 196 Q80 200 102 197 L198 181 Q202 176 195 175 Z"
        fill="#1a1408"
        opacity="0.3"
      />
      <g stroke="#475569" strokeWidth="10" strokeLinecap="round">
        <line x1="75" y1="118" x2="64" y2="193" />
        <line x1="85" y1="118" x2="96" y2="193" />
      </g>
      <ellipse cx="61" cy="196" rx="8" ry="3.5" fill="#1e293b" />
      <ellipse cx="99" cy="196" rx="8" ry="3.5" fill="#1e293b" />
      <path
        d="M61 62 Q62 56 68 56 L92 56 Q98 56 99 62 L93 122 L67 122 Z"
        fill="#cbd5e1"
      />
      <path d="M68 56 L80 74 L92 56 Z" fill="#1e3a8a" />
      <path d="M74 56 L80 66 L86 56 Z" fill="#f8fafc" />
      <rect x="67" y="114" width="26" height="5" fill="#1e293b" />
      <rect x="76" y="47" width="8" height="10" rx="3" fill={skin} />
      <circle cx="80" cy="38" r="11" fill={skin} />
      <ellipse cx="80" cy="29" rx="13" ry="3.5" fill="#f8fafc" />
      <path d="M70 29 Q70 21 80 21 Q90 21 90 29 Z" fill="#f8fafc" />
      <rect x="69" y="27" width="22" height="3" fill="#1e3a8a" />
      <g
        fill="none"
        stroke="#73829b"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Tangan kanan terjulur ke arah penerima (memendek karena mengarah ke kamera) */}
        <polyline points="66,62 59,58 60,50" />
        {/* Tangan kiri menekuk ke atas, memegang cermin di dekat mata kiri */}
        <polyline points="94,62 104,58 91,41" />
      </g>
      {/* Jari membentuk V */}
      <g stroke={skin} strokeWidth="2.4" strokeLinecap="round">
        <line x1="58.6" y1="47" x2="56.6" y2="40.5" />
        <line x1="61.1" y1="47" x2="63.1" y2="40.5" />
      </g>
      <circle cx="59.8" cy="48.5" r="3.4" fill={skin} />
      {/* Cermin: hampir tegak menghadap penerima saat memancar, ditundukkan saat jeda */}
      {on ? (
        <>
          <path
            d={`M${m.x - 5.5} ${m.y - 6} L${m.x + 4.5} ${m.y - 5} L${m.x + 4.5} ${m.y + 5.5} L${m.x - 5.5} ${m.y + 5} Z`}
            fill="#64748b"
          />
          <path
            d={`M${m.x - 4.5} ${m.y - 5} L${m.x + 3.5} ${m.y - 4.2} L${m.x + 3.5} ${m.y + 4.5} L${m.x - 4.5} ${m.y + 4} Z`}
            fill="#ffffff"
          />
        </>
      ) : (
        <rect
          x={m.x - 5}
          y={m.y + 4}
          width="10"
          height="3"
          rx="1"
          fill="#64748b"
        />
      )}
      <circle cx={m.x + 2} cy={m.y + 7} r="3.6" fill={skin} />
    </g>
  )
}

/**
 * Cermin sinyal di sore hari yang cerah dari sudut pandang penerima di puncak bukit (penerima tidak digambar),
 * di atas latar SVG lembah keemasan yang disinari matahari dari belakang penerima: pengirim jauh di bawah di
 * tanah lapang, menghadap penerima. Jeda: cermin ditundukkan, tidak ada kilatan. Titik dan strip: muka cermin diarahkan ke penerima
 * dan tampak sebagai kilatan menyilaukan, sebentar atau lebih lama.
 */
function SignalMirrorScene({
  on,
  className,
}: {
  on: boolean
  className?: string
}) {
  const id = useId()
  const g = (name: string) => `url(#${id}-${name})`
  const { sender, glint, boost } = MIRROR_SCENE

  return (
    <svg
      viewBox="0 0 240 170"
      preserveAspectRatio="xMidYMid slice"
      className={cn('h-auto max-w-full overflow-hidden', className)}
      aria-hidden="true"
    >
      <defs>
        {/* Pantulan cermin datar membawa warna sinar matahari itu sendiri: putih menyilaukan di inti,
            pendar keemasan matahari sore di sekelilingnya. Titik dan strip hanya beda lama, bukan warna */}
        <radialGradient id={`${id}-flash`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.2" stopColor="#fffbea" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#ffe2a0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        {/* Tepi gambar memudar ke transparan agar menyatu dengan warna kartu, ditambah bayangan gelap di
            sekelilingnya */}
        <filter
          id={`${id}-feather`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <mask
          id={`${id}-edge`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="240"
          height="170"
        >
          <rect
            x="8"
            y="7"
            width="224"
            height="156"
            rx="12"
            fill="#fff"
            filter={g('feather')}
          />
        </mask>
        <radialGradient id={`${id}-vignette`} cx="0.5" cy="0.5" r="0.72">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      <g mask={g('edge')}>
        <image
          href={MIRROR_BACKDROP}
          width="240"
          height="170"
          preserveAspectRatio="xMidYMid slice"
        />
        <rect width="240" height="170" fill={g('vignette')} />
      </g>

      {/* Pengirim di tanah lapang, menghadap penerima dengan cermin di depan mata */}
      <g
        transform={`translate(${sender.x} ${sender.y}) scale(${sender.s}) translate(${-PERSON_FOOT.x} ${-PERSON_FOOT.y})`}
      >
        <MirrorSender on={on} />
      </g>

      {/* Kilatan cermin: dari jauh tampak sebagai titik menyilaukan bersinar silang */}
      {on && (
        <>
          <circle cx={glint.x} cy={glint.y} r={14 * boost} fill={g('flash')} />
          <g fill="#fff">
            {[0, 90, 45, 135].map((a, i) => {
              const l = [22, 13, 8, 8][i] * boost
              const w = (i < 2 ? 0.9 : 0.5) * boost
              return (
                <path
                  key={a}
                  d={`M${-l} 0 L0 ${-w} L${l} 0 L0 ${w} Z`}
                  transform={`translate(${glint.x} ${glint.y}) rotate(${a})`}
                  opacity={i < 2 ? 0.95 : 0.7}
                />
              )
            })}
          </g>
          <circle cx={glint.x} cy={glint.y} r={2 * boost} fill="#fff" />
        </>
      )}
    </svg>
  )
}

/* ------------------------------------------------------------- Heliograph */

/** Perkiraan jarak pantulan cermin kecil masih terlihat saat cuaca cerah (km). */
const HELIO_RANGE_KM = 15

/**
 * Heliograph dengan cermin kecil: pantulan matahari dibidik lewat celah jari berbentuk V ke penerima di
 * bukit jauh, lalu dikedipkan dengan memiringkan cermin. Kecepatan dibatasi sama seperti Light Signal
 * (maksimal 3 kedipan per detik).
 */
function HeliographView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  const speed = Math.min(wpm, LIGHT_MAX_WPM)
  useEffect(() => p.stop, [code, p.stop])
  const color = p.symbol === '-' ? '#2563EB' : '#06B6D4'
  // Pemandangan di kiri, kontrol di kanan
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.sendFlashes}
          onToggle={() =>
            p.playing ? p.stop() : p.play(code, { wpm: speed, sound: false })
          }
          onStop={p.stop}
          className="flex-wrap"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150 ease-out"
            style={{
              background: p.on ? color : 'rgb(148 163 184 / 0.3)',
              boxShadow: p.on ? `0 0 8px 1px ${color}` : 'none',
            }}
          />
          <span
            className="inline-flex items-center whitespace-nowrap"
            title={msg.maxBlinks}
          >
            <span>{p.playing ? 'On air' : 'Standby'}</span>
            <span className="ml-4 inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              {speed} WPM
            </span>
          </span>
        </Controls>
      }
    >
      <SignalHeliograph on={p.on} color={color} className="w-full" />
      <p className="sr-only" aria-live="polite">
        {p.playing ? msg.helioFlashing(HELIO_RANGE_KM) : ''}
      </p>
    </PlayerGrid>
  )
}

/** Titik penting pemandangan (koordinat viewBox): cermin di tangan kiri, penerima di puncak bukit, bintik bidik di pangkal V, matahari. */
const HELIO = {
  mirror: { x: 62, y: 146 },
  receiver: { x: 249, y: 93 },
  spot: { x: 243.5, y: 119 },
  sun: { x: 40, y: 30 },
}
/** Kemiringan tangan dan cermin saat membidik (pantulan di jari) dan saat memancar (pantulan lolos lewat celah V). */
const HELIO_TILT = { off: -5, on: 0 }

/** Angka semu yang tetap (bukan acak) untuk tekstur rumput dan pepohonan, nilainya 0–1. */
const seeded = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** Garis pepohonan di punggung bukit tengah: deretan tajuk kecil yang tingginya berbeda-beda. */
const HELIO_TREELINE = (() => {
  let d = 'M0 116'
  for (let x = 0; x <= 320; x += 4) {
    const base =
      112 - 6 * Math.exp(-(((x - 249) / 38) ** 2)) + 2 * Math.sin(x / 23)
    d += ` Q${x + 2} ${(base - 2 - 2.5 * seeded(x)).toFixed(1)} ${x + 4} ${base.toFixed(1)}`
  }
  return `${d} L320 124 L0 124 Z`
})()

/** Helai rumput di latar depan bawah. */
const HELIO_GRASS = Array.from({ length: 90 }, (_, i) => {
  const x = (i / 90) * 330 - 5 + seeded(i) * 3
  const h = 5 + seeded(i + 100) * 9
  const lean = (seeded(i + 200) - 0.5) * 6
  return {
    d: `M${x.toFixed(1)} 181 Q${(x + lean / 2).toFixed(1)} ${(181 - h / 2).toFixed(1)} ${(x + lean).toFixed(1)} ${(181 - h).toFixed(1)}`,
    light: seeded(i + 300) > 0.6,
  }
})

/** Pohon satuan di padang tengah: x, y pangkal, dan ukuran tajuk. */
const HELIO_TREES = [
  { x: 128, y: 126, s: 5 },
  { x: 136, y: 127, s: 3.5 },
  { x: 302, y: 128, s: 6 },
  { x: 18, y: 127, s: 4.5 },
]

type HelioPt = { x: number; y: number }

/** Bentuk jari: kapsul meruncing dari pangkal (jari-jari r0) ke ujung (jari-jari r1). */
function capsule(a: HelioPt, b: HelioPt, r0: number, r1: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
  const f = (v: number) => v.toFixed(2)
  return [
    `M${f(a.x + n.x * r0)} ${f(a.y + n.y * r0)}`,
    `L${f(b.x + n.x * r1)} ${f(b.y + n.y * r1)}`,
    `A${r1} ${r1} 0 0 0 ${f(b.x - n.x * r1)} ${f(b.y - n.y * r1)}`,
    `L${f(a.x - n.x * r0)} ${f(a.y - n.y * r0)}`,
    `A${r0} ${r0} 0 0 0 ${f(a.x + n.x * r0)} ${f(a.y + n.y * r0)}`,
    'Z',
  ].join(' ')
}

/** Jari tangan kanan yang terlihat dari punggung tangan: pangkal, ujung, dan lebar pangkal/ujung. */
const HELIO_FINGERS = {
  index: { a: { x: 236.5, y: 121 }, b: { x: 229, y: 84 }, r0: 5.3, r1: 3.9 },
  middle: { a: { x: 250, y: 120 }, b: { x: 264.5, y: 81 }, r0: 5.5, r1: 4 },
  thumb: { a: { x: 236, y: 151 }, b: { x: 225.5, y: 133 }, r0: 6.2, r1: 4.6 },
  mirrorThumb: { a: { x: 30, y: 182 }, b: { x: 45, y: 158 }, r0: 8.5, r1: 6.5 },
}

/**
 * Jari dengan bayangan silinder (gelap di tepi, terang di tengah), kuku di ujung, dan lipatan sendi.
 * Gradien dipasang tegak lurus sumbu jari supaya terlihat membulat.
 */
function Finger({
  id,
  a,
  b,
  r0,
  r1,
  nail = true,
  creases = [0.35, 0.68],
}: {
  id: string
  a: HelioPt
  b: HelioPt
  r0: number
  r1: number
  nail?: boolean
  creases?: number[]
}) {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
  const n = { x: -u.y, y: u.x }
  const at = (t: number, side: number, r: number) => ({
    x: a.x + (b.x - a.x) * t + n.x * r * side,
    y: a.y + (b.y - a.y) * t + n.y * r * side,
  })
  const angle = (Math.atan2(u.y, u.x) * 180) / Math.PI
  const nailC = { x: b.x - u.x * r1 * 0.55, y: b.y - u.y * r1 * 0.55 }
  return (
    <g>
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={a.x + n.x * r0}
          y1={a.y + n.y * r0}
          x2={a.x - n.x * r0}
          y2={a.y - n.y * r0}
        >
          <stop offset="0" stopColor="#a8694a" />
          <stop offset="0.25" stopColor="#d9a07c" />
          <stop offset="0.55" stopColor="#efc4a2" />
          <stop offset="0.85" stopColor="#c88a66" />
          <stop offset="1" stopColor="#97593d" />
        </linearGradient>
      </defs>
      <path
        d={capsule(a, b, r0, r1)}
        fill={`url(#${id})`}
        stroke="#8a5238"
        strokeWidth="0.45"
      />
      {creases.map((t) => {
        const r = r0 + (r1 - r0) * t
        const p = at(t, 1, r * 0.7)
        const q = at(t, -1, r * 0.7)
        const mid = at(t - 0.025, 0, 0)
        return (
          <path
            key={t}
            d={`M${p.x.toFixed(2)} ${p.y.toFixed(2)} Q${mid.x.toFixed(2)} ${mid.y.toFixed(2)} ${q.x.toFixed(2)} ${q.y.toFixed(2)}`}
            fill="none"
            stroke="#9a5f43"
            strokeWidth="0.45"
            strokeLinecap="round"
            opacity="0.7"
          />
        )
      })}
      {nail && (
        <g transform={`rotate(${angle} ${nailC.x} ${nailC.y})`}>
          <ellipse
            cx={nailC.x}
            cy={nailC.y}
            rx={r1 * 1.05}
            ry={r1 * 0.68}
            fill="#f3cdbb"
            stroke="#b98066"
            strokeWidth="0.4"
          />
          <ellipse
            cx={nailC.x + r1 * 0.35}
            cy={nailC.y - r1 * 0.15}
            rx={r1 * 0.45}
            ry={r1 * 0.22}
            fill="#fff"
            opacity="0.55"
          />
        </g>
      )}
    </g>
  )
}

/**
 * Heliograph dengan cermin kecil, dilihat dari mata pengirim. Tangan kiri memegang cermin sinyal di dekat
 * mata (yang terlihat sisi belakangnya, cerminnya menghadap ke depan). Tangan kanan diulurkan dengan
 * punggung tangan menghadap mata; telunjuk dan jari tengah membentuk V yang mengapit penerima di puncak
 * bukit jauh. Saat membidik, bintik pantulan matahari jatuh di pangkal V; saat memancar cermin dimiringkan
 * sedikit sehingga pantulan lolos lewat celah V dan kilatan tampak di penerima.
 */
function SignalHeliograph({
  on,
  color,
  className,
}: {
  on: boolean
  color: string
  className?: string
}) {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const { mirror: m, receiver: rc, spot, sun } = HELIO
  const tilt = {
    transform: `rotate(${on ? HELIO_TILT.on : HELIO_TILT.off}deg)`,
    transformOrigin: `20px 180px`,
    transition: reduced ? 'none' : 'transform 60ms ease-out',
  }
  const g = (name: string) => `url(#${id}-${name})`
  const f = HELIO_FINGERS
  return (
    <svg
      viewBox="0 0 320 180"
      className={cn('h-auto max-w-full overflow-hidden rounded-md', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a72b0" />
          <stop offset="0.55" stopColor="#7ea9d2" />
          <stop offset="0.62" stopColor="#c7dbea" />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.12" stopColor="#fffbe8" />
          <stop offset="0.3" stopColor="#fff1b8" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff1b8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-far`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#97aec3" />
          <stop offset="1" stopColor="#b7c8d6" />
        </linearGradient>
        <linearGradient id={`${id}-mid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d8577" />
          <stop offset="1" stopColor="#8a9c86" />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d9b5a" />
          <stop offset="0.35" stopColor="#6f8040" />
          <stop offset="1" stopColor="#3d4a22" />
        </linearGradient>
        <linearGradient id={`${id}-sleeve`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b7155" />
          <stop offset="0.5" stopColor="#4c523b" />
          <stop offset="1" stopColor="#2f3324" />
        </linearGradient>
        <linearGradient id={`${id}-hand`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#c9906c" />
          <stop offset="0.35" stopColor="#ebbd9a" />
          <stop offset="0.7" stopColor="#d49a76" />
          <stop offset="1" stopColor="#9c6043" />
        </linearGradient>
        <linearGradient id={`${id}-mirrorback`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b616b" />
          <stop offset="0.5" stopColor="#363b43" />
          <stop offset="1" stopColor="#1e2228" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.6" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id={`${id}-flash`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.2" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor={color} stopOpacity="0.6" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-spot`}>
          <stop offset="0" stopColor="#fffef5" />
          <stop offset="0.4" stopColor="#fff6cf" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff6cf" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <filter id={`${id}-blur1`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        {/* Tekstur bintik rumput: noise abu-abu yang hanya menggelapkan sedikit */}
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9 0.35"
            numOctaves="3"
            seed="7"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0 0.05  0 0 0 -1.6 1.05"
          />
        </filter>
        <clipPath id={`${id}-groundclip`}>
          <path d="M0 126 C70 121 150 123 220 127 C260 129 295 127 320 125 V180 H0 Z" />
        </clipPath>
      </defs>

      {/* Langit dan awan tipis */}
      <rect width="320" height="180" fill={g('sky')} />
      <g fill="#fff" filter={g('soft')} opacity="0.75">
        <ellipse cx="150" cy="38" rx="34" ry="5" />
        <ellipse cx="172" cy="34" rx="18" ry="5" />
        <ellipse cx="270" cy="56" rx="30" ry="3.5" opacity="0.7" />
        <ellipse cx="95" cy="72" rx="26" ry="3" opacity="0.6" />
      </g>

      {/* Matahari dengan pendar */}
      <circle cx={sun.x} cy={sun.y} r="42" fill={g('sun')} />
      <circle cx={sun.x} cy={sun.y} r="6.5" fill="#fffef8" />

      {/* Pegunungan jauh, samar karena kabut udara */}
      <path
        d="M0 104 L22 99 L40 101 L64 95 L88 99 L118 97 L150 100 L176 96 L196 98 L214 94 L236 99 L280 96 L320 100 V130 H0 Z"
        fill={g('far')}
      />
      {/* Bukit tengah dengan pepohonan; penerima berdiri di puncaknya */}
      <path
        d="M0 112 C60 108 140 110 190 107 C215 105 232 95 249 94.5 C266 95 282 104 320 108 V130 H0 Z"
        fill={g('mid')}
      />
      <path d={HELIO_TREELINE} fill="#4f6656" opacity="0.55" />

      {/* Stasiun penerima: tripod heliograph dan petugas, kecil karena jauh */}
      <g stroke="#2e3640" strokeWidth="0.45" strokeLinecap="round">
        <line x1={rc.x} y1={rc.y} x2={rc.x - 1.6} y2={rc.y + 2.6} />
        <line x1={rc.x} y1={rc.y} x2={rc.x + 1.6} y2={rc.y + 2.6} />
        <line x1={rc.x} y1={rc.y} x2={rc.x} y2={rc.y + 2.6} />
        <line
          x1={rc.x + 3}
          y1={rc.y - 1.3}
          x2={rc.x + 3}
          y2={rc.y + 2.6}
          strokeWidth="0.8"
        />
      </g>
      <rect
        x={rc.x - 1}
        y={rc.y - 1.3}
        width="2"
        height="1.3"
        rx="0.3"
        fill="#2e3640"
      />
      <circle cx={rc.x + 3} cy={rc.y - 2.1} r="0.7" fill="#2e3640" />

      {/* Padang rumput di depan dengan tekstur, pohon, dan helai rumput */}
      <path
        d="M0 126 C70 121 150 123 220 127 C260 129 295 127 320 125 V180 H0 Z"
        fill={g('ground')}
      />
      <rect
        width="320"
        height="180"
        filter={g('grain')}
        clipPath={g('groundclip')}
        opacity="0.55"
      />
      {HELIO_TREES.map((t) => (
        <g key={t.x}>
          <ellipse
            cx={t.x + t.s * 0.6}
            cy={t.y + 0.6}
            rx={t.s * 1.1}
            ry={t.s * 0.22}
            fill="#2f3a1c"
            opacity="0.5"
          />
          <rect
            x={t.x - 0.35}
            y={t.y - t.s * 0.9}
            width="0.7"
            height={t.s * 0.9}
            fill="#3b2f22"
          />
          <ellipse
            cx={t.x}
            cy={t.y - t.s * 1.4}
            rx={t.s * 0.8}
            ry={t.s}
            fill="#3e5230"
          />
          <ellipse
            cx={t.x - t.s * 0.25}
            cy={t.y - t.s * 1.65}
            rx={t.s * 0.45}
            ry={t.s * 0.55}
            fill="#5f7a43"
            opacity="0.8"
          />
        </g>
      ))}
      <g strokeLinecap="round" fill="none" strokeWidth="0.8">
        {HELIO_GRASS.map((b, i) => (
          <path
            key={i}
            d={b.d}
            stroke={b.light ? '#8d9f52' : '#3b4a20'}
            opacity="0.7"
          />
        ))}
      </g>

      {/* Label jarak ke penerima */}
      <line
        x1={rc.x}
        y1={rc.y - 4}
        x2={rc.x}
        y2="74"
        stroke="#f8fafc"
        strokeWidth="0.6"
        strokeDasharray="1.5 1.5"
        opacity="0.9"
      />
      <rect
        x={rc.x - 21}
        y="61"
        width="42"
        height="13"
        rx="6.5"
        fill="#172033"
        opacity="0.85"
      />
      <text
        x={rc.x}
        y="70.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="600"
        fontFamily="var(--font-mono)"
        fill="#f8fafc"
      >
        ± {HELIO_RANGE_KM} km
      </text>

      {/* Sinar matahari ke muka cermin (cermin menghadap ke depan, menjauhi mata) */}
      <line
        x1={sun.x + 5}
        y1={sun.y + 6}
        x2={m.x + 6}
        y2={m.y - 14}
        stroke="#fff7d1"
        strokeWidth="0.7"
        strokeDasharray="1.5 2.5"
        opacity="0.6"
      />

      {/* Lengan kanan terulur: lengan bawah melebar ke arah mata, lalu lengan jaket di sudut kanan bawah */}
      <path
        d="M242 160 C252 163 262 162 269 157 C282 165 296 172 306 180 L255 180 C252 172 247 166 242 160 Z"
        fill={g('hand')}
        stroke="#8a5238"
        strokeWidth="0.45"
      />
      <path
        d="M262 180 C266 172 276 166 292 164 C302 163 312 161 320 159 V180 Z"
        fill={g('sleeve')}
      />
      <path
        d="M262 180 C266 172 276 166 292 164 C302 163 312 161 320 159"
        fill="none"
        stroke="#262a1c"
        strokeWidth="0.8"
      />
      <path
        d="M280 176 C288 171 298 169 310 168 M296 180 C302 176 310 174 318 173"
        fill="none"
        stroke="#7c8364"
        strokeWidth="0.6"
        opacity="0.6"
      />
      <Finger id={`${id}-thumb`} {...f.thumb} creases={[0.5]} nail={false} />
      <Finger id={`${id}-index`} {...f.index} />
      <Finger id={`${id}-middle`} {...f.middle} />
      {/* Punggung tangan menutup pangkal jari; tepi atasnya adalah deretan buku jari, termasuk jari manis dan
          kelingking yang terlipat di sisi kanan */}
      <path
        d="M228.5 124 C230 120 234 118.5 237.5 119.5 C240.5 118 243.5 118.6 246 119.4 C249 117.2 253.5 117.4 255.5 119.2 C258.5 117.6 264.5 117.8 266.5 121.5 C270.5 122.5 273.5 126 273 131 C274 142 271 151 268 158 C260 162 250 163 243 162 C236 154 230 140 228.5 124 Z"
        fill={g('hand')}
      />
      <path
        d="M228.5 124 C230 140 236 154 243 162 M273 131 C274 142 271 151 268 158 M266.5 121.5 C270.5 122.5 273.5 126 273 131"
        fill="none"
        stroke="#8a5238"
        strokeWidth="0.45"
      />
      {/* Kilau buku jari dan lipatan jari yang terlipat */}
      <g fill="none" strokeLinecap="round">
        <path
          d="M233.5 121.5 q3 -1.6 6 0 M247.5 120.5 q3 -1.6 6 0 M259 121 q3.5 -1.6 6.5 0.4 M267 126 q3 -1 5 1"
          stroke="#fff"
          strokeWidth="0.7"
          opacity="0.35"
        />
        <path
          d="M258 125 q4 1 7 -1 M266.5 130 q3 1 5.5 -0.5"
          stroke="#9a5f43"
          strokeWidth="0.5"
          opacity="0.7"
        />
      </g>
      {/* Tulang punggung tangan */}
      <g
        fill="none"
        stroke="#b97b58"
        strokeWidth="0.5"
        strokeLinecap="round"
        opacity="0.5"
      >
        <path d="M238 125 C240 135 241 146 245 156" />
        <path d="M251 124 C252 135 253 146 255 157" />
        <path d="M262 128 C262 137 261 147 262 156" />
      </g>

      {/* Tangan kiri memegang cermin sinyal di dekat mata; tangan dan cermin miring bersama */}
      <g style={tilt}>
        <path d="M0 156 C10 158 22 168 26 180 L0 180 Z" fill={g('sleeve')} />
        {/* Telapak di bawah cermin; telunjuk melingkar di tepi bawah cermin, jari lain di sisi depan */}
        <path
          d="M6 180 C10 170 24 165 40 167 L84 158 C91 157 94 162 90 167 C80 173 66 177 58 180 Z"
          fill={g('hand')}
          stroke="#8a5238"
          strokeWidth="0.45"
        />
        <path
          d="M46 172 C60 169 74 166 88 162 M52 177 C62 175 70 173 78 170"
          fill="none"
          stroke="#9a5f43"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* Cermin sinyal dari belakang: badan gelap, tepi kaca terkena matahari, lubang bidik di tengah */}
        <g transform={`rotate(-14 ${m.x} ${m.y})`}>
          <rect
            x={m.x - 24}
            y={m.y - 17}
            width="48"
            height="34"
            rx="3"
            fill="#121418"
          />
          <rect
            x={m.x - 23}
            y={m.y - 16}
            width="46"
            height="32"
            rx="2.5"
            fill={g('mirrorback')}
          />
          <rect
            x={m.x - 23}
            y={m.y - 18}
            width="46"
            height="2.2"
            rx="1"
            fill="#eef6ff"
          />
          <rect x={m.x - 22} y={m.y - 18} width="44" height="0.8" fill="#fff" />
          <rect
            x={m.x - 20}
            y={m.y - 13}
            width="40"
            height="26"
            rx="1.5"
            fill="none"
            stroke="#6b717b"
            strokeWidth="0.5"
            opacity="0.7"
          />
          <circle cx={m.x} cy={m.y} r="2.4" fill="#0b0d10" />
          <circle
            cx={m.x}
            cy={m.y}
            r="1.5"
            fill={on ? color : '#cfe3f3'}
            opacity={on ? 1 : 0.8}
          />
          <text
            x={m.x + 8}
            y={m.y + 10}
            textAnchor="middle"
            fontSize="3"
            fontFamily="var(--font-mono)"
            fill="#8b929c"
            letterSpacing="0.4"
          >
            SIGNAL MIRROR
          </text>
        </g>
        {/* Ibu jari menekan bagian belakang cermin, tidak menutup lubang bidik */}
        <Finger id={`${id}-mthumb`} {...f.mirrorThumb} creases={[0.55]} />
        {on && (
          <circle
            cx={m.x}
            cy={m.y - 16}
            r="10"
            fill={g('flash')}
            opacity="0.55"
          />
        )}
      </g>

      {/* Pantulan: saat membidik jatuh di pangkal V, saat memancar lolos lewat celah V ke penerima */}
      {on ? (
        <>
          <path
            d={`M${m.x + 4} ${m.y - 20} L${rc.x} ${rc.y - 0.6} L${rc.x} ${rc.y + 0.6} L${m.x + 9} ${m.y - 15} Z`}
            fill={g('beam')}
          />
          <circle cx={rc.x} cy={rc.y - 0.5} r="12" fill={g('flash')} />
          <g stroke="#fff" strokeLinecap="round" opacity="0.9">
            <line
              x1={rc.x - 11}
              y1={rc.y - 0.5}
              x2={rc.x + 11}
              y2={rc.y - 0.5}
              strokeWidth="0.6"
            />
            <line
              x1={rc.x}
              y1={rc.y - 9}
              x2={rc.x}
              y2={rc.y + 8}
              strokeWidth="0.5"
            />
          </g>
        </>
      ) : (
        <>
          <line
            x1={m.x + 6}
            y1={m.y - 19}
            x2={spot.x}
            y2={spot.y}
            stroke="#fff7d1"
            strokeWidth="0.6"
            strokeDasharray="1.5 2.5"
            opacity="0.45"
          />
          <circle cx={spot.x} cy={spot.y} r="5.5" fill={g('spot')} />
        </>
      )}
    </svg>
  )
}

/* -------------------------------------------------------------- Eye Signal */

/**
 * Morse dengan kedipan mata: mata terpejam sebentar untuk titik dan lebih lama untuk strip, terbuka saat
 * jeda. Kecepatan dibatasi agar satu titik mendekati kedipan alami.
 */
function EyeSignalView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  const speed = Math.min(wpm, EYE_MAX_WPM)
  useEffect(() => p.stop, [code, p.stop])
  const color = p.symbol === '-' ? '#2563EB' : '#06B6D4'
  // Mata di kiri, kontrol di kanan
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={p.playing}
          label={msg.startBlinking}
          onToggle={() =>
            p.playing ? p.stop() : p.play(code, { wpm: speed, sound: false })
          }
          onStop={p.stop}
          className="flex-wrap"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full transition-[background-color,box-shadow] duration-150 ease-out"
            style={{
              background: p.on ? color : 'rgb(148 163 184 / 0.3)',
              boxShadow: p.on ? `0 0 8px 1px ${color}` : 'none',
            }}
          />
          <span className="inline-flex items-center whitespace-nowrap">
            <span>{p.playing ? 'On air' : 'Standby'}</span>
            <span className="ml-4 inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              {speed} WPM
            </span>
          </span>
        </Controls>
      }
    >
      <SignalEye closed={p.on} className="w-28 shrink-0 sm:w-36" />
      <p className="sr-only" aria-live="polite">
        {p.playing ? msg.eyeBlinking : ''}
      </p>
    </PlayerGrid>
  )
}

/** Garis serat iris, dihitung sekali. */
const IRIS_FIBERS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2
  return {
    x1: Math.cos(a) * 11,
    y1: Math.sin(a) * 11,
    x2: Math.cos(a) * 23,
    y2: Math.sin(a) * 23,
  }
})

/** Bukaan mata (mata kiri pada gambar): sudut luar di kiri, sudut dalam dekat hidung di kanan. */
const EYE_OPENING = 'M12 62 C45 22 130 18 186 64 L186 66 C150 92 60 94 12 62 Z'
const EYE_UPPER = 'M12 62 C45 22 130 18 186 64'
const EYE_LOWER = 'M186 66 C150 92 60 94 12 62'
/** Tepi kelopak saat terpejam, sedikit di atas kelopak bawah. */
const EYE_CLOSED = 'M14 62 C60 92 150 92 186 66'

type Pt = [number, number]
const cubicAt = ([a, b, c, d]: Pt[], t: number): Pt => {
  const u = 1 - t
  const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
  return [0, 1].map(
    (i) => k[0] * a[i] + k[1] * b[i] + k[2] * c[i] + k[3] * d[i],
  ) as Pt
}

/**
 * Bulu mata di sepanjang tepi kelopak: berpangkal tepat di garis, melengkung ke arah sudut luar, paling
 * panjang di tengah. `dir` -1 menghadap ke atas (terbuka), 1 ke bawah (terpejam).
 */
function lashes(curve: Pt[], dir: 1 | -1) {
  return Array.from({ length: 15 }, (_, i) => {
    const t = 0.12 + (i / 14) * 0.76
    const [x, y] = cubicAt(curve, t)
    const len = 5 + 4 * Math.sin(Math.PI * t)
    const r = (n: number) => n.toFixed(1)
    return `M${r(x)} ${r(y)} q${r(-len * 0.25)} ${r(dir * len * 0.7)} ${r(-len * 0.8)} ${r(dir * len)}`
  }).join(' ')
}
const LASHES_OPEN = lashes(
  [
    [12, 62],
    [45, 22],
    [130, 18],
    [186, 64],
  ],
  -1,
)
const LASHES_CLOSED = lashes(
  [
    [14, 62],
    [60, 92],
    [150, 92],
    [186, 66],
  ],
  1,
)

/**
 * Sepasang mata realistis di potongan wajah: alis, lipatan kelopak, iris berserat dengan cincin limbal,
 * dan pantulan cahaya. Saat terpejam kelopak atas turun menutup bola mata dan bulu mata pindah ke tepi
 * bawah. Mata kanan adalah cerminan mata kiri.
 */
function SignalEye({
  closed,
  className,
}: {
  closed: boolean
  className?: string
}) {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const lid = {
    transform: `translateY(${closed ? 0 : -72}px)`,
    transition: reduced ? 'none' : 'transform 70ms ease-in-out',
  }
  const eye = (
    <>
      {/* Alis: lebih tebal di ujung dalam */}
      <path
        d="M22 30 C60 2 130 -6 194 14 L192 26 C130 8 62 12 22 30 Z"
        fill="#3b2a20"
        opacity="0.9"
      />
      <g transform="translate(0 32)">
        {/* Lipatan kelopak atas */}
        <path
          d="M26 46 C60 10 130 6 180 46"
          fill="none"
          stroke="#a87c63"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
        <g clipPath={`url(#${id}-open)`}>
          <path d={EYE_OPENING} fill={`url(#${id}-sclera)`} />
          <g transform="translate(98 58)">
            <circle r="25" fill={`url(#${id}-iris)`} />
            <g stroke="#cfe3f5" strokeOpacity="0.18" strokeWidth="0.8">
              {IRIS_FIBERS.map((f, i) => (
                <line key={i} {...f} />
              ))}
            </g>
            <circle r="25" fill="none" stroke="#0f1a2a" strokeWidth="2.5" />
            <circle r="9.5" fill="#05080d" />
            <ellipse
              cx="8"
              cy="-8"
              rx="4.5"
              ry="3.2"
              fill="#fff"
              opacity="0.9"
            />
            <circle cx="-8" cy="9" r="1.6" fill="#fff" opacity="0.45" />
          </g>
          {/* Bayangan kelopak atas di bola mata */}
          <rect
            x="0"
            y="18"
            width="200"
            height="30"
            fill={`url(#${id}-shade)`}
          />
          {/* Kelopak atas yang bergerak; tepi bawahnya mengikuti kelopak bawah saat terpejam */}
          <g style={lid}>
            <path
              d="M0 -40 H200 V66 C150 96 60 98 0 62 Z"
              fill={`url(#${id}-lid)`}
            />
          </g>
        </g>
        {/* Karunkula di sudut dalam */}
        {!closed && (
          <ellipse
            cx="180"
            cy="65"
            rx="5"
            ry="3.5"
            fill="#d98f8a"
            opacity="0.85"
          />
        )}
        <path
          d={EYE_LOWER}
          fill="none"
          stroke="#8a6352"
          strokeWidth="1.5"
          opacity="0.8"
        />
        {closed ? (
          // Terpejam: garis bulu mata di tepi bawah, bulu mata menunjuk ke bawah
          <g stroke="#24170f" strokeLinecap="round" fill="none">
            <path d={EYE_CLOSED} strokeWidth="2.5" />
            <path d={LASHES_CLOSED} strokeWidth="1.1" />
          </g>
        ) : (
          // Terbuka: garis bulu mata di kelopak atas, bulu mata melengkung ke atas
          <g stroke="#24170f" strokeLinecap="round" fill="none">
            <path d={EYE_UPPER} strokeWidth="2.5" />
            <path d={LASHES_OPEN} strokeWidth="1.1" />
          </g>
        )}
      </g>
    </>
  )
  return (
    <svg
      viewBox="0 -12 500 172"
      className={cn('h-auto max-w-full', className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-open`}>
          <path d={EYE_OPENING} />
        </clipPath>
        <radialGradient id={`${id}-skin`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#e9c6aa" />
          <stop offset="1" stopColor="#c99a7c" />
        </radialGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.6" stopColor="#e2b99c" />
          <stop offset="1" stopColor="#c2917a" />
        </linearGradient>
        <radialGradient id={`${id}-sclera`} cx="0.5" cy="0.55" r="0.6">
          <stop offset="0.5" stopColor="#f8f6f3" />
          <stop offset="1" stopColor="#dcc9c0" />
        </radialGradient>
        <radialGradient id={`${id}-iris`}>
          <stop offset="0.35" stopColor="#7a9cc0" />
          <stop offset="0.75" stopColor="#3a628d" />
          <stop offset="1" stopColor="#1d3550" />
        </radialGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Potongan wajah sebagai latar */}
      <rect
        x="0"
        y="-12"
        width="500"
        height="172"
        rx="22"
        fill={`url(#${id}-skin)`}
      />
      <g transform="translate(26 0)">{eye}</g>
      <g transform="translate(474 0) scale(-1 1)">{eye}</g>
    </svg>
  )
}

/* ------------------------------------------------ Audio telegraf (disembunyikan) */

/** Audio Signal seperti telegram: kunci telegraf bergerak mengikuti sinyal, dengan bunyi klik-klak sounder dan nada. */
/** Disembunyikan dari tab; disimpan untuk dipakai di tempat lain. */
export function TelegraphAudioView({
  code,
  wpm,
}: {
  code: string
  wpm: number
}) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  useEffect(() => p.stop, [code, p.stop])
  return (
    <div className="flex flex-col gap-5">
      <div className="grid place-items-center py-2">
        <TelegraphKey
          pressed={p.on}
          label={p.playing ? msg.telegraphKeySending : msg.telegraphKey}
          className="w-full max-w-sm"
        />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <PlayButton
            playing={p.playing}
            label={msg.playSound}
            onClick={() =>
              p.playing ? p.stop() : p.play(code, { wpm, voice: 'sounder' })
            }
          />
          <StopButton disabled={!p.playing} onClick={p.stop} />
        </div>
        <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-xs text-signal-offwhite/55">
          <span className="inline-flex items-center gap-1.5">
            <Volume2 className="size-3.5" aria-hidden="true" /> {msg.telegraphSounder}
          </span>
          <span>
            {msg.speed} <span className="text-signal-cyan">{wpm} WPM</span>
          </span>
          <span aria-live="polite" className="inline-block w-14 text-left">
            {p.playing ? msg.playing : msg.ready}
          </span>
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------- Lampu sinyal Aldis (disembunyikan) */

/** Disembunyikan dari tab; disimpan untuk dipakai di tempat lain. */
export function AldisLightView({ code, wpm }: { code: string; wpm: number }) {
  const msg = useT(viewerMessages)
  const p = useMorsePlayer()
  const speed = Math.min(wpm, LIGHT_MAX_WPM)
  useEffect(() => p.stop, [code, p.stop])
  // Pola sama dengan Audio Signal: lampu, lalu tombol dan keterangan di tengah
  return (
    <div className="flex flex-col gap-5">
      {/* overflow-hidden agar sorotan yang memudar tidak meluber ke luar panel */}
      <div className="grid place-items-center overflow-hidden py-2">
        <SignalLamp on={p.on} />
      </div>
      <p className="sr-only" aria-live="polite">
        {p.playing ? msg.lampBlinking : ''}
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <PlayButton
            playing={p.playing}
            label={msg.lightOn}
            onClick={() =>
              p.playing ? p.stop() : p.play(code, { wpm: speed, sound: false })
            }
          />
          <StopButton disabled={!p.playing} onClick={p.stop} />
        </div>
        <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-xs text-signal-offwhite/55">
          <span>
            {msg.speed} <span className="text-signal-cyan">{speed} WPM</span>
          </span>
          <span>{msg.maxBlinksShort}</span>
          {/* Lebar tetap agar baris tidak bergeser saat status berganti setiap kedipan */}
          <span className="inline-block w-[7.5rem] text-left">
            {p.on
              ? p.symbol === '-'
                ? msg.lampOnDash
                : msg.lampOnDot
              : p.playing
                ? msg.lampOff
                : msg.ready}
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Ilustrasi lampu sinyal Aldis, lampu Morse kapal dan militer: bodi ringkas dengan lensa besar,
 * teropong bidik di atas, dan gagang pistol berpelatuk. Saat mati, bilah penutup menutupi lensa.
 * Saat menyala, lensa bercahaya dan sorotan lebar berwarna putih, seperti cahaya lampu sungguhan. Titik dan
 * strip hanya dibedakan lama nyalanya.
 */
function SignalLamp({
  on,
  className = 'w-80 sm:w-96',
}: {
  on: boolean
  className?: string
}) {
  const id = useId()
  const color = '#f8fafc'
  const u = (name: string) => `url(#${id}-${name})`
  return (
    <svg
      viewBox="0 -40 330 216"
      overflow="visible"
      className={cn('h-auto max-w-full', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b7a93" />
          <stop offset="0.2" stopColor="#3b475c" />
          <stop offset="0.65" stopColor="#1f2735" />
          <stop offset="1" stopColor="#0f141d" />
        </linearGradient>
        <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#465369" />
          <stop offset="0.3" stopColor="#232c3c" />
          <stop offset="1" stopColor="#0c1018" />
        </linearGradient>
        <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b3bdcd" />
          <stop offset="0.3" stopColor="#5a667d" />
          <stop offset="1" stopColor="#161c27" />
        </linearGradient>
        <linearGradient id={`${id}-grip`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b222e" />
          <stop offset="0.5" stopColor="#2c3546" />
          <stop offset="1" stopColor="#141a24" />
        </linearGradient>
        <radialGradient id={`${id}-lens-off`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#3d4c66" />
          <stop offset="1" stopColor="#0a0e16" />
        </radialGradient>
        <radialGradient id={`${id}-lens-on`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.75" />
        </radialGradient>
        {/* Sorotan memudar melingkar dari lensa ke segala arah (bukan hanya ke depan), jadi tidak ada tepi yang terpotong */}
        <radialGradient
          id={`${id}-beam`}
          gradientUnits="userSpaceOnUse"
          cx="172"
          cy="66"
          r="130"
        >
          <stop offset="0" stopColor={color} stopOpacity="0.5" />
          <stop offset="0.4" stopColor={color} stopOpacity="0.2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id={`${id}-core`}
          gradientUnits="userSpaceOnUse"
          cx="172"
          cy="66"
          r="96"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter
          id={`${id}-beam-blur`}
          x="-50%"
          y="-60%"
          width="200%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${id}-soft`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}-glow`} x="-150%" y="-60%" width="400%" height="220%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <clipPath id={`${id}-lens-clip`}>
          <ellipse cx="170" cy="66" rx="9" ry="38" />
        </clipPath>
      </defs>

      {/* Bayangan */}
      <ellipse
        cx="110"
        cy="148"
        rx="80"
        ry="4"
        fill="#000"
        opacity="0.45"
        filter={u('soft')}
      />

      {/* Sorotan pendek tapi menyebar tinggi dari lensa besar, memudar sebelum tepi gambar */}
      <g className="transition-opacity duration-75" opacity={on ? 1 : 0}>
        <polygon
          points="172,26 330,-38 330,170 172,106"
          fill={u('beam')}
          filter={u('beam-blur')}
        />
        <polygon
          points="172,40 300,-6 300,138 172,92"
          fill={u('core')}
          filter={u('beam-blur')}
        />
      </g>

      {/* Gagang pistol dan pelatuk */}
      <path
        d="M78 92 L104 92 L98 142 Q97 147 92 147 L74 147 Q69 147 70 142 Z"
        fill={u('grip')}
      />
      {[104, 112, 120, 128, 136].map((y) => (
        <line
          key={y}
          x1={74 + (y - 104) * 0.05}
          x2={98 - (y - 104) * 0.12}
          y1={y}
          y2={y}
          stroke="#000"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
      ))}
      <path
        d="M108 92 Q118 96 114 112 Q112 116 108 113 Q111 102 104 96 Z"
        fill={on ? color : '#2a3446'}
        className="transition-colors duration-75"
      />

      {/* Teropong bidik di atas */}
      <rect x="84" y="32" width="6" height="10" fill="#1a212d" />
      <rect x="128" y="32" width="6" height="10" fill="#1a212d" />
      <rect x="70" y="22" width="80" height="11" rx="3" fill={u('dark')} />
      <rect x="66" y="20" width="8" height="15" rx="2" fill={u('bezel')} />
      <rect x="146" y="20" width="8" height="15" rx="2" fill={u('bezel')} />

      {/* Bodi lampu dengan tutup belakang dan kisi ventilasi */}
      <rect x="30" y="42" width="16" height="50" rx="7" fill={u('dark')} />
      <rect x="42" y="40" width="114" height="54" rx="6" fill={u('metal')} />
      {[58, 66, 74, 82].map((x) => (
        <rect
          key={x}
          x={x}
          y="50"
          width="3"
          height="34"
          rx="1.5"
          fill="#0a0e15"
          opacity="0.7"
        />
      ))}
      <path
        d="M46 44 H152"
        stroke="#ffffff"
        strokeOpacity="0.2"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Rumah lensa melebar dan bezel besar */}
      <path d="M156 40 L162 28 L162 104 L156 94 Z" fill={u('metal')} />
      <rect x="160" y="24" width="12" height="84" rx="4" fill={u('bezel')} />

      {/* Lensa: bilah penutup saat mati, cahaya terang saat menyala */}
      {on && (
        <ellipse
          cx="172"
          cy="66"
          rx="12"
          ry="40"
          fill={color}
          opacity="0.9"
          filter={u('glow')}
        />
      )}
      <ellipse
        cx="170"
        cy="66"
        rx="9"
        ry="38"
        fill={on ? u('lens-on') : u('lens-off')}
      />
      {!on && (
        <g
          clipPath={u('lens-clip')}
          stroke="#8fa0bb"
          strokeOpacity="0.3"
          strokeWidth="1.2"
        >
          {[42, 54, 66, 78, 90].map((y) => (
            <line key={y} x1="160" x2="180" y1={y} y2={y} />
          ))}
        </g>
      )}
    </svg>
  )
}

/* ------------------------------------------------------------- Flag Signal */

/*
 * Morse bendera, mengikuti cara pengiriman:
 * - Titik: bendera digerakkan sejauh 90 derajat (setinggi bahu) dari posisi sedia, lalu kembali ke tengah.
 * - Strip: bendera digerakkan penuh sejauh 180 derajat (hingga ke bawah hampir menyentuh tanah), lalu
 *   kembali ke posisi sedia.
 * - Aba-aba mulai: bendera diayunkan membentuk angka delapan di depan badan.
 * - Jeda antarhuruf: bendera diam 1 detik pada posisi sedia.
 * - Akhir kata: tongkat digerakkan ke bawah sampai menyentuh tanah, lalu kembali ke posisi sedia.
 * Posisi sedia: bendera tegak di tengah; setiap gerakan kembali ke posisi ini.
 * Spesifikasi bendera: 90 × 60 cm pada tongkat sekitar 1,5 m. Warna disesuaikan latar: dasar putih
 * dengan garis tengah hitam/biru untuk latar gelap, atau sebaliknya.
 */

type FlagPose = 'up' | 'dot' | 'dash' | 'pause' | 'word' | 'eight'
/** Gerakan yang tampil di legenda (semua pose selain posisi sedia). */
type FlagKind = Exclude<FlagPose, 'up'>

/** Sudut tongkat dari posisi tegak, dilihat dari depan. Titik dan strip ke samping yang sama. Jeda tetap tegak; akhir kata tidak berputar, tongkat diturunkan lurus. */
const FLAG_ANGLE: Record<FlagPose, number> = {
  up: 0,
  dot: -90,
  dash: -180,
  pause: 0,
  word: 0,
  eight: 0,
}

/** Durasi peragaan (ms). Jeda antarhuruf 1 detik sesuai aturan; akhir kata cukup ditandai tongkat turun sebentar. */
const FLAG_STROKE_MS = 420
const FLAG_RETURN_MS = 280
const FLAG_LETTER_PAUSE_MS = 1000
const FLAG_WORD_PAUSE_MS = 700
const FLAG_EIGHT_MS = 1200
/** Jarak tongkat diturunkan di akhir kata: pangkal tongkat (36 cm di bawah pangkal putaran) sampai menyentuh tanah. */
const FLAG_WORD_DROP = 92

/** Langkah peragaan; `marked` untuk gerakan yang ditandai di legenda (bukan kembali ke posisi sedia). */
type FlagStep = { pose: FlagPose; ms: number; marked?: boolean }

/** Teks Morse menjadi urutan langkah peragaan. */
function flagSteps(code: string): FlagStep[] {
  const words = normalizeMorse(code)
    .split(' / ')
    .filter(Boolean)
    .map((w) => w.split(' ').filter(Boolean))
  // Aba-aba mulai dan tanda akhir kata hanya untuk kata; satu huruf (misalnya di Morse Explorer) cukup gerakannya saja
  const framed = words.flat().length > 1
  const steps: FlagStep[] = []
  const move = (pose: FlagPose, ms: number) =>
    steps.push({ pose, ms, marked: true }, { pose: 'up', ms: FLAG_RETURN_MS })
  // Aba-aba mulai: angka delapan di depan badan
  if (framed) move('eight', FLAG_EIGHT_MS)
  for (const word of words) {
    word.forEach((letter, li) => {
      for (const sym of letter)
        move(sym === '.' ? 'dot' : 'dash', FLAG_STROKE_MS)
      // Jeda antarhuruf: diam 1 detik di posisi sedia
      if (li < word.length - 1)
        steps.push({ pose: 'pause', ms: FLAG_LETTER_PAUSE_MS, marked: true })
    })
    // Akhir kata: tongkat turun sebentar sampai menyentuh tanah
    if (framed) move('word', FLAG_WORD_PAUSE_MS)
  }
  return steps
}

function FlagSignalView({ code }: { code: string }) {
  const msg = useT(viewerMessages)
  const steps = useMemo(() => flagSteps(code), [code])
  const [step, setStep] = useState<number | null>(null)

  // Peragaan berurutan dengan timer; berhenti saat kode berganti atau komponen dilepas
  useEffect(() => {
    if (step === null) return
    if (step >= steps.length) {
      setStep(null)
      return
    }
    const t = setTimeout(
      () => setStep((i) => (i === null ? null : i + 1)),
      steps[step].ms,
    )
    return () => clearTimeout(t)
  }, [step, steps])
  useEffect(() => setStep(null), [code])

  const current = step === null ? undefined : steps[step]
  const pose: FlagPose = current?.pose ?? 'up'
  // Penanda aktif di legenda: gerakan yang sedang diperagakan
  const active = current?.marked ? current.pose : null
  const playing = step !== null

  const color: Record<FlagKind, string> = {
    dot: 'text-morse-dot',
    dash: 'text-morse-dash',
    pause: 'text-signal-offwhite/50',
    word: 'text-signal-offwhite/50',
    eight: 'text-signal-offwhite/50',
  }
  const kinds = new Set(steps.filter((s) => s.marked).map((s) => s.pose))
  // Ruang kosong di kanan gambar tiap ikon (px pada ukuran 20 px), diukur dari batas gambarnya. Dipakai
  // agar tepi kanan semua ikon rata sehingga jarak ke teks sama untuk setiap item legenda
  const GLYPH_RIGHT_SPACE: Record<FlagKind, number> = {
    dot: 8,
    dash: 8,
    eight: 2,
    pause: 9,
    word: 2,
  }
  const legend: { kind: FlagKind; text: string }[] = [
    { kind: 'dot', text: msg.flagLegend.dot },
    { kind: 'dash', text: msg.flagLegend.dash },
    { kind: 'eight', text: msg.flagLegend.eight },
    { kind: 'pause', text: msg.flagLegend.pause },
    { kind: 'word', text: msg.flagLegend.word },
  ]

  // Pemberi sinyal di kiri; di kanan kontrol dengan legenda rata kanan, legenda sekaligus penanda gerakan aktif
  return (
    <PlayerGrid
      controls={
        <Controls
          playing={playing}
          label={msg.demoFlag}
          onToggle={() => setStep(playing ? null : 0)}
          onStop={() => setStep(null)}
        >
          {/* Legenda dua kolom di samping tombol: ikon dalam kotak selebar sama agar teks tiap kolom sejajar */}
          <span className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1.5">
            {legend
              .filter((l) => kinds.has(l.kind))
              .map((l) => (
                <span
                  key={l.kind}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="flex w-5 shrink-0 justify-end">
                    <span
                      className="flex"
                      style={{ marginRight: -GLYPH_RIGHT_SPACE[l.kind] }}
                    >
                      <FlagGlyph
                        pose={l.kind}
                        className={cn(
                          'size-5 transition-transform duration-100',
                          color[l.kind],
                          active === l.kind && 'scale-125',
                        )}
                      />
                    </span>
                  </span>
                  {l.text}
                </span>
              ))}
          </span>
        </Controls>
      }
    >
      {/* Sedikit lebih tinggi dari lampu di Light Signal agar figur terbaca */}
      <FlagSignaller pose={pose} className="h-20 w-auto shrink-0 sm:h-28" />
    </PlayerGrid>
  )
}

/** Ikon gerakan bendera untuk urutan dan legenda; aba-aba mulai digambar sebagai angka delapan. */
function FlagGlyph({
  pose,
  className,
}: {
  pose: FlagPose
  className?: string
}) {
  if (pose === 'word')
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('size-6 shrink-0', className)}
        aria-hidden="true"
      >
        <line
          x1="9"
          y1="9"
          x2="9"
          y2="22"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="9" y="9" width="7.5" height="5" rx="0.5" fill="currentColor" />
        <path
          d="M18 2 V7 M15.5 4.8 L18 7.3 L20.5 4.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  if (pose === 'pause')
    return (
      // Bendera tegak di posisi sedia: diam sejenak di antara huruf
      <svg
        viewBox="0 0 24 24"
        className={cn('size-6 shrink-0', className)}
        aria-hidden="true"
      >
        <line
          x1="7"
          y1="3"
          x2="7"
          y2="21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="7" y="3" width="6" height="4.5" rx="0.5" fill="currentColor" />
      </svg>
    )
  if (pose === 'eight')
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('size-6 shrink-0', className)}
        aria-hidden="true"
      >
        <path
          d="M12 12 C 8 6, 3 8, 3 12 C 3 16, 8 18, 12 12 C 16 6, 21 8, 21 12 C 21 16, 16 18, 12 12 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    )
  return (
    // Pangkal tongkat di tengah ikon sehingga semua arah tetap sejajar; garis putus-putus = posisi sedia
    <svg
      viewBox="0 0 24 24"
      className={cn('size-6 shrink-0', className)}
      aria-hidden="true"
    >
      {pose !== 'up' && (
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="2.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="1.5 1.5"
          opacity="0.45"
        />
      )}
      <g transform={`rotate(${FLAG_ANGLE[pose]} 12 12)`}>
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="12"
          y="2"
          width="6.5"
          height="4.5"
          rx="0.5"
          fill="currentColor"
        />
      </g>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

/** Posisi tongkat yang dianimasikan: sudut (derajat), turun lurus di akhir kata, dan geser vertikal untuk angka delapan. */
interface FlagMotion {
  angle: number
  drop: number
  lift: number
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/**
 * Satu tween untuk semua bagian (tongkat, lengan, tangan, busur sudut) agar gerakannya menyatu.
 * Gerakan ke pose berakhir tepat di sudut aturan; angka delapan dijalankan sebagai lintasan parametrik.
 */
function useFlagMotion(pose: FlagPose): FlagMotion {
  const reduced = usePrefersReducedMotion()
  const [motion, setMotion] = useState<FlagMotion>({
    angle: 0,
    drop: 0,
    lift: 0,
  })
  const ref = useRef(motion)
  ref.current = motion

  useEffect(() => {
    const target: FlagMotion = {
      angle: FLAG_ANGLE[pose],
      drop: pose === 'word' ? FLAG_WORD_DROP : 0,
      lift: 0,
    }
    if (reduced) {
      setMotion(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const from = ref.current
    const tick = (now: number) => {
      if (pose === 'eight') {
        // Ujung bendera menggambar angka delapan: ayunan samping dua kali lebih lambat dari naik-turun
        const t = Math.min(1, (now - start) / FLAG_EIGHT_MS)
        const k = Math.min(1, t * 6, (1 - t) * 6)
        setMotion({
          angle: from.angle * (1 - k) + 28 * Math.sin(2 * Math.PI * t) * k,
          drop: 0,
          lift: -10 * Math.sin(4 * Math.PI * t) * k,
        })
        if (t < 1) raf = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(1, (now - start) / 260)
      const e = easeInOutCubic(t)
      setMotion({
        angle: from.angle + (target.angle - from.angle) * e,
        drop: from.drop + (target.drop - from.drop) * e,
        lift: from.lift * (1 - e),
      })
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pose, reduced])

  return motion
}

/**
 * Pemberi sinyal dengan bendera Morse sesuai spesifikasi: bendera 90 × 60 cm, tongkat 1,5 m, dasar putih
 * dengan garis tengah biru (untuk latar gelap). Skala 1 unit = 1 cm, tinggi orang sekitar 165 cm.
 * Posisi sedia: tongkat tegak di garis tengah badan, dipegang kedua tangan di depan dada.
 * Pangkal putaran setinggi bahu: 90° membuat tongkat mendatar setinggi bahu, 180° membuat ujungnya
 * hampir menyentuh tanah.
 */
const FLAG_PIVOT = { x: 80, y: 70 }

function FlagSignaller({
  pose,
  className,
}: {
  pose: FlagPose
  className?: string
}) {
  const { angle, drop, lift } = useFlagMotion(pose)
  const rad = (angle * Math.PI) / 180
  const dir = { x: Math.sin(rad), y: -Math.cos(rad) }
  const pivot = { x: FLAG_PIVOT.x, y: FLAG_PIVOT.y + drop + lift }
  const grip = (along: number) => ({
    x: pivot.x + dir.x * along,
    y: pivot.y + dir.y * along,
  })
  // Kedua tangan menggenggam agak ke tengah tongkat, tidak di ujung bawah. Saat tongkat diturunkan,
  // genggaman bergeser naik agar tangan tetap setinggi pinggang sementara tongkat meluncur ke tanah
  const slide = drop * 0.4
  const lowerHand = grip(4 + slide)
  const upperHand = grip(22 + slide)
  const shoulderL = { x: 66, y: 62 }
  const shoulderR = { x: 94, y: 62 }
  const showArc = (pose === 'dot' || pose === 'dash') && Math.abs(angle) > 2
  const arcR = 40
  const arcEnd = {
    x: FLAG_PIVOT.x + Math.sin(rad) * arcR,
    y: FLAG_PIVOT.y - Math.cos(rad) * arcR,
  }
  const label = {
    x: FLAG_PIVOT.x + Math.sin(rad / 2) * (arcR + 14),
    y: FLAG_PIVOT.y - Math.cos(rad / 2) * (arcR + 14),
  }
  const skin = '#e3cbb5'
  const shirt = '#cbd5e1'

  return (
    <svg
      viewBox="-44 -56 264 262"
      className={cn('h-auto max-w-full', className)}
      aria-hidden="true"
    >
      <ellipse cx="80" cy="199" rx="34" ry="3.5" fill="#000" opacity="0.35" />

      {/* Busur sudut dari posisi sedia, hanya saat titik dan strip */}
      {showArc && (
        <g className="text-signal-cyan">
          <line
            x1={FLAG_PIVOT.x}
            y1={FLAG_PIVOT.y}
            x2={FLAG_PIVOT.x}
            y2={FLAG_PIVOT.y - arcR - 8}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <path
            d={`M${FLAG_PIVOT.x} ${FLAG_PIVOT.y - arcR} A${arcR} ${arcR} 0 0 0 ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontFamily="var(--font-mono)"
            fill="currentColor"
          >
            {Math.round(Math.abs(angle))}°
          </text>
        </g>
      )}

      {/* Figur bergaya bagan semaphore: kaki terbuka huruf A, seragam dengan kerah, topi pelaut */}
      <g strokeLinecap="round">
        <line
          x1="75"
          y1="118"
          x2="64"
          y2="193"
          stroke="#475569"
          strokeWidth="10"
        />
        <line
          x1="85"
          y1="118"
          x2="96"
          y2="193"
          stroke="#475569"
          strokeWidth="10"
        />
      </g>
      <ellipse cx="61" cy="196" rx="8" ry="3.5" fill="#1e293b" />
      <ellipse cx="99" cy="196" rx="8" ry="3.5" fill="#1e293b" />
      <path
        d="M61 62 Q62 56 68 56 L92 56 Q98 56 99 62 L93 122 L67 122 Z"
        fill={shirt}
      />
      <path d="M68 56 L80 74 L92 56 Z" fill="#1e3a8a" />
      <path d="M74 56 L80 66 L86 56 Z" fill="#f8fafc" />
      <rect x="67" y="114" width="26" height="5" fill="#1e293b" />
      <rect x="76" y="47" width="8" height="10" rx="3" fill={skin} />
      <circle cx="80" cy="38" r="11" fill={skin} />
      {/* Topi pelaut */}
      <ellipse cx="80" cy="29" rx="13" ry="3.5" fill="#f8fafc" />
      <path d="M70 29 Q70 21 80 21 Q90 21 90 29 Z" fill="#f8fafc" />
      <rect x="69" y="27" width="22" height="3" fill="#1e3a8a" />

      {/* Lengan dari bahu ke tangan, di depan badan; sedikit lebih gelap dari kemeja agar terbaca */}
      <g stroke="#73829b" strokeWidth="7.5" strokeLinecap="round">
        <line
          x1={shoulderL.x}
          y1={shoulderL.y}
          x2={lowerHand.x}
          y2={lowerHand.y}
        />
        <line
          x1={shoulderR.x}
          y1={shoulderR.y}
          x2={upperHand.x}
          y2={upperHand.y}
        />
      </g>

      {/* Tongkat dan bendera di depan badan */}
      <g transform={`translate(${pivot.x} ${pivot.y}) rotate(${angle})`}>
        <rect
          x="-1.75"
          y="-114"
          width="3.5"
          height="150"
          rx="1.75"
          fill="#b08a5f"
        />
        <rect x="1.75" y="-112" width="90" height="60" fill="#f8fafc" />
        <rect x="1.75" y="-92" width="90" height="20" fill="#2563eb" />
      </g>

      {/* Kepalan tangan menggenggam tongkat */}
      <circle cx={lowerHand.x} cy={lowerHand.y} r="5.5" fill={skin} />
      <circle cx={upperHand.x} cy={upperHand.y} r="5.5" fill={skin} />
    </svg>
  )
}

/* --------------------------------------------------------- Signal Timeline */

function SignalTimelineView({ code, plain }: { code: string; plain: string }) {
  const msg = useT(viewerMessages)
  const timings = toTimings(code)
  const total = totalUnits(timings)
  const U = Math.max(8, Math.min(40, 640 / Math.max(total, 1)))
  const W = total * U
  const TOP = 14
  const BASE = 50
  const LABEL_Y = 70
  const chars = Array.from(plain.replace(/\s+/g, '')).filter((c) => c !== ' ')

  const has = {
    dot: timings.some((t) => t.on && t.symbol === '.'),
    dash: timings.some((t) => t.on && t.symbol === '-'),
    symbolGap: timings.some((t) => !t.on && t.units === 1),
    letterGap: timings.some((t) => !t.on && t.units === 3),
    wordGap: timings.some((t) => !t.on && t.units === 7),
  }

  // Setiap segmen: denyut (titik/strip) atau jeda, lengkap dengan label di bawahnya
  const segments: {
    x: number
    w: number
    on: boolean
    symbol?: '.' | '-'
    label: string
  }[] = []
  let x = 0
  let li = 0
  let newLetter = true
  for (const t of timings) {
    const w = t.units * U
    if (t.on) {
      if (newLetter && segments.length > 0) li++
      newLetter = false
      segments.push({
        x,
        w,
        on: true,
        symbol: t.symbol,
        label: chars[li] ?? '',
      })
    } else {
      if (t.units >= 3) newLetter = true
      segments.push({ x, w, on: false, label: `${t.units}u` })
    }
    x += w
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        {/* Ukuran asli per unit, tidak ditarik selebar kontainer: kode pendek seperti E tetap kecil. Hanya mengecil jika lebih lebar dari kontainer */}
        <svg
          viewBox={`-4 0 ${W + 8} 80`}
          style={{ width: W + 8, maxWidth: '100%' }}
          className="h-auto"
          role="img"
          aria-label={`Signal Timeline: ${toDitDah(code)}`}
        >
          {/* Grid per unit */}
          {Array.from({ length: total + 1 }, (_, i) => (
            <line
              key={i}
              x1={i * U}
              x2={i * U}
              y1={TOP - 6}
              y2={BASE + 6}
              stroke="#F8FAFC"
              strokeOpacity="0.06"
            />
          ))}
          {segments.map((sg, i) => {
            const color = sg.symbol === '.' ? '#06B6D4' : '#2563EB'
            const showLabel = sg.on ? sg.w >= 8 && sg.label : sg.w >= 16
            return (
              <g key={i}>
                {sg.on ? (
                  <>
                    <rect
                      x={sg.x}
                      y={TOP}
                      width={sg.w}
                      height={BASE - TOP}
                      fill={color}
                      fillOpacity="0.1"
                    />
                    <polyline
                      points={`${sg.x},${BASE} ${sg.x},${TOP} ${sg.x + sg.w},${TOP} ${sg.x + sg.w},${BASE}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <line
                    x1={sg.x}
                    x2={sg.x + sg.w}
                    y1={BASE}
                    y2={BASE}
                    stroke="#F59E0B"
                    strokeOpacity="0.85"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                )}
                {showLabel && (
                  <text
                    x={sg.x + sg.w / 2}
                    y={LABEL_Y}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="var(--font-mono)"
                    fill={sg.on ? color : '#F59E0B'}
                    fillOpacity={sg.on ? 1 : 0.85}
                  >
                    {sg.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda hanya memuat unsur yang ada di timeline ini: satu huruf tidak punya jeda huruf maupun jeda kata */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-signal-offwhite/60">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {has.dot && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-sm bg-morse-dot"
                aria-hidden="true"
              />{' '}
              {msg.timelineDot}
            </span>
          )}
          {has.dash && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-5 rounded-sm bg-morse-dash"
                aria-hidden="true"
              />{' '}
              {msg.timelineDash}
            </span>
          )}
          {(
            [
              [has.symbolGap, msg.timelineSymbolGap],
              [has.letterGap, msg.timelineLetterGap],
              [has.wordGap, msg.timelineWordGap],
            ] as const
          )
            .filter(([shown]) => shown)
            .map(([, label]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span
                  className="w-5 border-t-2 border-dashed border-amber-500/85"
                  aria-hidden="true"
                />{' '}
                {label}
              </span>
            ))}
        </p>
        <p className="font-mono text-signal-offwhite/80 tabular-nums">
          {msg.timelineTotal(total)}
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Morse Chart */

/** Pohon Morse klasik hingga 4 tingkat: titik selalu ke cabang kiri, strip ke cabang kanan. Hanya simpul huruf A–Z yang digambar. */
const TREE = buildMorseTree(4).filter((n) => n.depth === 0 || n.char)
const TREE_BY_CODE = new Map(TREE.map((n) => [n.code, n]))

/** Jeda per langkah saat jalur ditelusuri, dan lama hasil ditahan sebelum kembali ke tampilan penuh (ms). */
const TRACE_STEP_MS = 450
const TRACE_HOLD_MS = 1200

/**
 * Morse Chart sederhana berupa pohon biner: dari antena di atas, titik ke kiri dan strip ke kanan, satu
 * tingkat per simbol. Simpul titik berupa lingkaran, simpul strip berupa persegi panjang, dan jalur huruf
 * menyala. Tombol Telusuri menjalankan jalur dari antena, satu simbol per langkah.
 */
function MorseChartView({
  code,
  showAnswer,
}: {
  code: string
  showAnswer: boolean
}) {
  const msg = useT(viewerMessages)
  const letters = useMemo(() => lettersOf(code), [code])
  const [step, setStep] = useState(0)
  // Jumlah simbol yang sudah ditelusuri; null = tidak menelusuri, jalur tampil penuh
  const [trace, setTrace] = useState<number | null>(null)
  useEffect(() => setStep(0), [code])
  const current = letters[Math.min(step, letters.length - 1)] ?? ''
  useEffect(() => setTrace(null), [current])
  useEffect(() => {
    if (trace === null) return
    const done = trace >= current.length
    const t = setTimeout(
      () => setTrace(done ? null : trace + 1),
      done ? TRACE_HOLD_MS : TRACE_STEP_MS,
    )
    return () => clearTimeout(t)
  }, [trace, current])

  const tracing = trace !== null
  const shown = tracing ? current.slice(0, trace) : current
  const path = new Set(pathTo(shown))
  const outside = !!current && !TREE_BY_CODE.has(current)

  // Kanvas: talang kiri untuk nomor tingkat, baris atas untuk judul dan legenda
  const W = 640
  const GUTTER = 28
  const TOP = 56
  const ROW = 52
  const R = 13
  const H = TOP + 4 * ROW + R + 2
  const pos = (n: { x: number; depth: number }) => ({
    x: GUTTER + n.x * (W - GUTTER),
    y: TOP + n.depth * ROW,
  })
  const color = (c: string) => (c.endsWith('.') ? '#06B6D4' : '#2563EB')
  const root = pos(TREE_BY_CODE.get('')!)
  const nodes = TREE.filter((n) => n.depth > 0)
  const headColor = shown ? color(shown) : '#06B6D4'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto h-auto w-full max-w-2xl min-w-[480px]"
          role="img"
          aria-label={
            showAnswer && CODE_TO_CHAR[current]
              ? msg.chartPathTo(CODE_TO_CHAR[current])
              : msg.chartPathHighlighted
          }
        >
          {/* Judul dan legenda arah cabang */}
          <text
            x="0"
            y="10"
            fontSize="10"
            letterSpacing="2"
            fontFamily="var(--font-mono)"
            fill="#F8FAFC"
            fillOpacity="0.45"
          >
            MORSE TREE
          </text>
          <g
            fontSize="10"
            letterSpacing="1"
            fontFamily="var(--font-mono)"
            fill="#F8FAFC"
            fillOpacity="0.55"
          >
            <circle
              cx={W - 214}
              cy="6.5"
              r="3"
              fill="#06B6D4"
              fillOpacity="1"
            />
            <text x={W - 122} y="10" textAnchor="end">
              {msg.chartDotLeft}
            </text>
            <rect
              x={W - 108}
              y="5"
              width="10"
              height="3"
              rx="1.5"
              fill="#2563EB"
              fillOpacity="1"
            />
            <text x={W} y="10" textAnchor="end">
              {msg.chartDashRight}
            </text>
          </g>

          {/* Nomor tingkat = jumlah simbol */}
          {[1, 2, 3, 4].map((d) => (
            <text
              key={d}
              x="0"
              y={TOP + d * ROW + 3.5}
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="#F8FAFC"
              fillOpacity={shown.length >= d ? 0.7 : 0.3}
            >
              {d}
            </text>
          ))}

          {/* Penghubung siku: turun dari induk, mendatar, lalu turun ke anak. Titik cyan ke kiri, strip biru ke kanan */}
          {nodes.map((n) => {
            const a = pos(TREE_BY_CODE.get(n.code.slice(0, -1))!)
            const b = pos(n)
            const mid = a.y + ROW / 2
            const on = path.has(n.code)
            return (
              <path
                key={`e${n.code}`}
                d={`M${a.x} ${a.y + (n.depth === 1 ? 0 : R)} V${mid} H${b.x} V${b.y - R}`}
                fill="none"
                stroke={color(n.code)}
                strokeOpacity={on ? 1 : 0.28}
                strokeWidth={on ? 2.5 : 1.25}
                strokeLinejoin="round"
              />
            )
          })}

          {/* Antena sebagai akar */}
          <g
            stroke={shown ? color(shown.slice(0, 1)) : '#F8FAFC'}
            strokeOpacity={shown ? 1 : 0.45}
            strokeWidth="1.75"
            strokeLinecap="round"
            fill="none"
          >
            <line x1={root.x} y1={root.y} x2={root.x} y2={root.y - 20} />
            <path
              d={`M${root.x - 7} ${root.y - 20} L${root.x} ${root.y - 8} L${root.x + 7} ${root.y - 20}`}
            />
          </g>

          {nodes.map((n) => {
            const { x, y } = pos(n)
            const on = path.has(n.code)
            const head = n.code === shown
            const c = color(n.code)
            const label =
              n.code === current && !showAnswer ? '?' : (n.char ?? '')
            return (
              <g key={n.code}>
                <circle
                  cx={x}
                  cy={y}
                  r={R}
                  fill={head ? c : on ? `${c}26` : 'transparent'}
                  stroke={on ? c : '#F8FAFC'}
                  strokeOpacity={on ? 1 : 0.18}
                  strokeWidth="1.5"
                  style={
                    head
                      ? { filter: `drop-shadow(0 0 6px ${headColor})` }
                      : undefined
                  }
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                  fill={head && n.code.endsWith('.') ? '#172033' : '#F8FAFC'}
                  fillOpacity={head || on ? 1 : 0.7}
                >
                  {label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Controls
          playing={tracing}
          label={msg.tracePath}
          onToggle={() => setTrace(tracing ? null : 0)}
          onStop={() => setTrace(null)}
        />
        {letters.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={msg.prevChar}
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="grid size-8 place-items-center rounded-lg bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-mono text-xs text-signal-offwhite/70">
              {step + 1} / {letters.length}
            </span>
            <button
              type="button"
              aria-label={msg.nextChar}
              disabled={step >= letters.length - 1}
              onClick={() => setStep((s) => s + 1)}
              className="grid size-8 place-items-center rounded-lg bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
      {outside && (
        <p className="text-center text-xs text-signal-offwhite/50">
          {msg.chartOutside}
        </p>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------- Text */

/** Warna tinta di atas kertas: versi lebih gelap dari cyan (titik) dan biru (strip) agar kontras. */
const INK = { dot: '#0e7490', dash: '#1d4ed8', text: '#334155' }

/** Goyangan kecil yang tetap (bukan acak) agar goresan terlihat seperti tulisan tangan. */
const wobble = (n: number) => ((n * 37) % 7) / 3 - 1

/**
 * Text bergaya tulisan di kertas bergaris: titik dan strip digores dengan tinta, bacaan dit/dah dan huruf
 * ditulis tangan. Goresan muncul berurutan seolah sedang ditulis, dan diulang setiap kode berganti.
 */
function DotDashTextView({
  code,
  plain,
  compact,
}: {
  code: string
  plain: string
  compact?: boolean
}) {
  const locale = useLocale()
  const words = normalizeMorse(code).split(' / ')
  const plainWords = plain ? plain.trim().split(/\s+/) : []
  const showLabels = Array.from(plain.replace(/\s+/g, '')).length > 1
  // Ukuran goresan: titik, panjang strip, dan jarak antarsimbol
  const u = compact ? 12 : 16
  const STEP_MS = 110
  let mark = 0

  return (
    <div
      key={code}
      className="relative rounded-md bg-[#fbf8ef] py-2 pr-5 pl-12 shadow-[0_1px_0_rgb(0_0_0/0.05),0_10px_24px_-14px_rgb(0_0_0/0.6)]"
      style={{
        // Garis kertas setiap 32px, sejajar dengan tinggi baris tulisan
        backgroundImage:
          'repeating-linear-gradient(to bottom, transparent 0 31px, rgb(37 99 235 / 0.16) 31px 32px)',
        backgroundPositionY: '8px',
      }}
    >
      {/* Garis margin merah */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-8 w-px bg-red-400/50"
      />
      <div className="flex flex-wrap gap-x-10">
        {words.map((w, wi) => {
          const chars = Array.from(plainWords[wi] ?? '').filter(
            (c) => MORSE_TABLE[c],
          )
          return (
            <div key={wi} className="flex flex-wrap gap-x-6">
              {w.split(' ').map((letter, li) => {
                const syms = Array.from(letter)
                const width = syms.reduce(
                  (x, s) => x + (s === '.' ? u : u * 2.4) + u * 0.5,
                  0,
                )
                let x = 0
                const start = mark
                return (
                  // Per huruf: goresan titik dan strip, bacaan dit/dah, lalu hurufnya; tiap baris setinggi satu garis kertas
                  <div key={li} className="flex flex-col items-start">
                    <svg
                      width={width}
                      height="32"
                      viewBox={`0 0 ${width} 32`}
                      role="img"
                      aria-label={toSpoken(letter, locale)}
                    >
                      {syms.map((s, si) => {
                        const n = mark++
                        const j = wobble(n)
                        const delay = { animationDelay: `${n * STEP_MS}ms` }
                        const cx = x
                        x += (s === '.' ? u : u * 2.4) + u * 0.5
                        return s === '.' ? (
                          <circle
                            key={si}
                            cx={cx + u / 2}
                            cy={25 + j * 0.6}
                            r={u * 0.2}
                            fill={INK.dot}
                            className="animate-ink-dot"
                            style={delay}
                          />
                        ) : (
                          <path
                            key={si}
                            d={`M${cx + 1} ${25 + j} q${u * 1.2} ${-1.5 + j} ${u * 2.4 - 2} ${j * 0.6}`}
                            pathLength={1}
                            fill="none"
                            stroke={INK.dash}
                            strokeWidth={u * 0.2}
                            strokeLinecap="round"
                            className="animate-ink-stroke"
                            style={delay}
                          />
                        )
                      })}
                    </svg>
                    <span
                      className="animate-ink-fade h-8 font-[family-name:var(--font-hand)] text-xl leading-8"
                      style={{
                        color: INK.text,
                        animationDelay: `${start * STEP_MS}ms`,
                      }}
                    >
                      {toDitDah(letter)}
                    </span>
                    {showLabels && (
                      <span
                        className="animate-ink-fade h-8 font-[family-name:var(--font-hand)] text-2xl leading-8 font-bold"
                        style={{
                          color: INK.text,
                          animationDelay: `${mark * STEP_MS}ms`,
                        }}
                      >
                        {chars[li] ?? ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
