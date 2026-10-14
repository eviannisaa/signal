import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2, Loader2, Lock, Radio, Users, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '#/lib/utils'
import { MORSE_VIEW_LABELS } from '#/lib/morse'
import { useIntlLocale, useT } from '#/lib/i18n'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSlashed, RadioPanel } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

import { guessMessage } from '../server'
import type { FeedMessage } from '../server'
import { MAX_GUESS_ATTEMPTS } from '../score'
import { messageMessages } from '../messages'

function timeLabel(iso: string, intlLocale: string) {
  return new Date(iso).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' })
}

/** Kode unik pesan untuk ditampilkan, diambil dari ID pesan di database, misalnya TX-3F9A. */
export function messageCode(id: string) {
  return `TX-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

/** Feed bergaya log transmisi: TX-XXXX <nickname>, lalu pesan dalam sinyal pilihan pengirim. */
export function MessageFeed({ gameId, messages, onChanged }: { gameId: string; messages: FeedMessage[]; onChanged: () => void }) {
  const t = useT(messageMessages).feed
  return (
    <RadioPanel channel="LOG" title={t.title} led bodyClassName="p-0 sm:p-0" actions={<span className="font-mono text-[0.68rem] text-signal-offwhite/45">{t.count(messages.length)}</span>}>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Radio className="size-7 text-signal-cyan/70" aria-hidden="true" />
          <p className="max-w-sm text-sm text-signal-offwhite/70">{t.empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {messages.map((m) => (
            <FeedItem key={m.id} gameId={gameId} message={m} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </RadioPanel>
  )
}

function StatusChip({ message }: { message: FeedMessage }) {
  const t = useT(messageMessages).feed
  const base = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium'
  switch (message.myStatus) {
    case 'mine':
      return (
        <span className={cn(base, 'bg-white/10 text-signal-offwhite/80')}>
          <Users className="size-3" aria-hidden="true" /> {t.mineStatus(message.solvedBy, message.guessedBy - message.solvedBy)}
        </span>
      )
    case 'correct':
      return (
        <span className={cn(base, 'bg-green-500/15 text-green-300')}>
          <CheckCircle2 className="size-3" aria-hidden="true" /> {t.correct}
        </span>
      )
    case 'failed':
      return (
        <span className={cn(base, 'bg-red-500/15 text-red-300')}>
          <XCircle className="size-3" aria-hidden="true" /> {t.failed}
        </span>
      )
    default:
      return (
        <span className={cn(base, 'bg-signal-cyan/15 text-signal-cyan')}>
          <Lock className="size-3" aria-hidden="true" /> {t.attemptsLeft(message.attemptsLeft)}
        </span>
      )
  }
}

function FeedItem({ gameId, message, onChanged }: { gameId: string; message: FeedMessage; onChanged: () => void }) {
  const t = useT(messageMessages).feed
  const intlLocale = useIntlLocale()
  const revealed = message.text !== null

  // Pesan selalu terbuka: kode, pengirim, sinyal pilihan pengirim, dan form tebakan langsung terlihat
  return (
    <li className="flex flex-col gap-4 px-5 py-5">
      <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 font-mono text-xs">
        <span className="text-signal-cyan">{messageCode(message.id)}</span>
        <span className="max-w-[12rem] truncate font-semibold text-signal-offwhite">{message.isMine ? t.you : message.sender}</span>
        <span className="ml-auto flex items-center gap-2">
          <StatusChip message={message} />
          <span className="text-signal-offwhite/40">{timeLabel(message.createdAt, intlLocale)}</span>
        </span>
      </div>
      {/* Pesan tampil dalam sinyal pilihan pengirim; tanpa tab, karena penebak harus membaca sinyal ini */}
      <div className="flex flex-col gap-1.5">
        <p className="radio-label text-signal-offwhite/40">{MORSE_VIEW_LABELS[message.signal]}</p>
        {message.signal === 'text' ? (
          <MorseSlashed code={message.morse} className="py-1" />
        ) : (
          <MorseViewer
            value={message.morse}
            view={message.signal}
            mode="question"
            hideTabs
            className="rounded-xl! border-white/10! bg-black/20! bg-none! shadow-none! backdrop-blur-none!"
          />
        )}
      </div>
      {/* Isi pesan yang sudah terbuka tampil tepat di bawah sandinya */}
      {revealed && <p className="-mt-1.5 font-mono text-sm font-semibold tracking-wider text-signal-offwhite/90">“{message.text}”</p>}
      {message.myStatus === 'open' && <GuessForm gameId={gameId} message={message} onChanged={onChanged} />}
      {message.myStatus === 'failed' && <p className="text-sm text-signal-offwhite/65">{t.failedNote}</p>}

    </li>
  )
}

/**
 * Satu kartu hasil decode untuk semua pesan, terlihat oleh semua pemain (hanya nama dan status, tanpa isi
 * pesan). Dibuat ringkas dan tenang agar tidak mengganggu konsentrasi: tiap pesan dua
 * baris kecil berisi kode, ringkasan berhasil/penebak, dan chip nama bertitik warna (hijau berhasil, merah gagal).
 */
export function GuessResultsCard({ messages }: { messages: FeedMessage[] }) {
  const msg = useT(messageMessages)
  const t = msg.results
  return (
    <RadioPanel channel="RX" title={t.title} led bodyClassName="p-0 sm:p-0">
      {messages.length === 0 ? (
        <p className="px-5 py-5 text-sm text-signal-offwhite/40">{t.empty}</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {messages.map((m) => {
            const guessers = m.guessers
            const solved = guessers.filter((g) => g.correct).length
            return (
              <li key={m.id} className="flex flex-col gap-2 px-5 py-3">
                <p className="flex items-center gap-2 font-mono text-[0.6875rem]">
                  <span className="text-signal-cyan/80">{messageCode(m.id)}</span>
                  {/* Hanya pesan milik pembaca yang diberi penanda; pesan pemain lain cukup kodenya */}
                  {m.isMine && (
                    <span className="rounded bg-white/[0.06] px-1.5 py-px font-sans text-[0.6875rem] font-medium text-signal-offwhite/40">{msg.feed.you}</span>
                  )}
                  <span className="ml-auto text-signal-offwhite/40 tabular-nums" title={t.summary(solved, guessers.length)}>
                    {solved}/{guessers.length}
                  </span>
                </p>
                {guessers.length ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label={t.guessers(messageCode(m.id))}>
                    {guessers.map((g) => (
                      <li
                        key={g.nickname}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/[0.05] py-0.5 pr-2 pl-1.5 text-xs text-signal-offwhite/75"
                      >
                        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', g.correct ? 'bg-green-400' : 'bg-red-400')} />
                        <span className="truncate">{g.nickname}</span>
                        <span className="sr-only">{g.correct ? t.success : t.fail}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-signal-offwhite/35">{t.noGuessers}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </RadioPanel>
  )
}

function GuessForm({ gameId, message, onChanged }: { gameId: string; message: FeedMessage; onChanged: () => void }) {
  const t = useT(messageMessages).guess
  const guess = useServerFn(guessMessage)
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const inputId = useId()
  const hintId = useId()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!value.trim() || pending) return
    setPending(true)
    try {
      const res = await guess({ data: { gameId, messageId: message.id, guess: value } })
      if (res.correct) {
        toast.success(t.correct)
      } else if (res.attemptsLeft === 0) {
        toast.error(t.failed)
      } else {
        setFeedback(t.wrong(res.attemptsLeft))
        setValue('')
      }
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.sendFailed)
      onChanged()
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      {/* Label dan sisa kesempatan hanya untuk pembaca layar; sisa kesempatan sudah terlihat di lencana status */}
      <label htmlFor={inputId} className="sr-only">
        {t.label}
      </label>
      <span id={hintId} className="sr-only">
        {t.hint(message.attemptsLeft, MAX_GUESS_ATTEMPTS)}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setFeedback(null)
          }}
          maxLength={60}
          autoComplete="off"
          spellCheck={false}
          placeholder={t.placeholder}
          aria-describedby={hintId}
          className="h-11 flex-1 rounded-xl border-white/15 bg-black/25 font-mono tracking-wide text-signal-offwhite uppercase placeholder:normal-case placeholder:text-signal-offwhite/35"
        />
        <Button type="submit" disabled={pending || !value.trim()} className="h-11 rounded-xl px-5">
          {pending && <Loader2 className="animate-spin" />}
          {t.submit}
        </Button>
      </div>
      {/* Tetap dirender agar pembaca layar mengumumkan perubahan, tetapi tidak memakan tempat saat kosong */}
      <p className="text-sm text-red-300 empty:hidden" aria-live="polite">
        {feedback && (
          <span className="inline-flex items-center gap-1.5">
            <XCircle className="size-4" aria-hidden="true" /> {feedback}
          </span>
        )}
      </p>
    </form>
  )
}
