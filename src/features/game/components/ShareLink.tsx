import { useEffect, useId, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { useT } from '#/lib/i18n'
import { Button } from '#/components/ui/button'

import { gameMessages } from '../messages'

/** Link game beserta tombol "Salin link". */
export function ShareLink({ gameId }: { gameId: string }) {
  const t = useT(gameMessages).share
  const path = `/g/${gameId}`
  const [url, setUrl] = useState(path)
  const [copied, setCopied] = useState(false)
  const id = useId()

  useEffect(() => setUrl(`${window.location.origin}${path}`), [path])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success(t.copySuccess)
    } catch {
      // Clipboard dapat diblokir, misalnya di koneksi non-HTTPS; pilih teks agar dapat disalin manual
      const input = document.getElementById(id) as HTMLInputElement | null
      input?.select()
      toast.error(t.copyFailed)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="radio-label text-signal-offwhite/55">
        {t.label}
      </label>
      <div className="flex min-w-0 items-stretch gap-2">
        <input
          id={id}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 truncate rounded-xl border border-white/15 bg-black/25 px-3 font-mono text-sm text-signal-offwhite/90 outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
        />
        <Button type="button" onClick={copy} className="h-10 shrink-0 rounded-xl px-4">
          {copied ? <Check /> : <Copy />}
          {copied ? t.copied : t.copy}
        </Button>
      </div>
    </div>
  )
}
