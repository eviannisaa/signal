import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { useT } from '#/lib/i18n'
import { cn } from '#/lib/utils'
import { Input } from '#/components/ui/input'
import { authMessages } from '../messages'

/** Input password dengan tombol tampilkan/sembunyikan. */
export function PasswordInput({ id, className, ...props }: Omit<ComponentProps<typeof Input>, 'type'> & { id: string }) {
  const [show, setShow] = useState(false)
  const t = useT(authMessages)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t.hidePassword : t.showPassword}
        aria-pressed={show}
        aria-controls={id}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-signal-offwhite/55 transition-colors hover:text-signal-offwhite focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-cyan"
      >
        {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
