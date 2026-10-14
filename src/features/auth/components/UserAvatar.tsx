import { cn } from '#/lib/utils'

/** Foto profil, atau inisial nama di atas gradasi brand jika belum ada foto. */
export function UserAvatar({ name, image, className }: { name: string; image: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-signal-blue to-signal-cyan text-xs font-semibold text-signal-offwhite',
        className,
      )}
    >
      {image ? <img src={image} alt="" className="size-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  )
}
