import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { ArrowRight, BarChart3, GraduationCap, Headphones, Languages, ListChecks, LogOut, Menu, Radio, Settings, Target, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '#/lib/utils'
import { authClient } from '#/lib/auth-client'
import type { CurrentUser } from '#/features/auth/server'
import { UserAvatar } from '#/features/auth/components/UserAvatar'
import { Button } from '#/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { useT } from '#/lib/i18n'
import { SignalLed, SignalLogo } from './primitives'
import { LanguageSwitch } from './LanguageSwitch'
import { shellMessages } from './messages'

interface Channel {
  to: '/learn' | '/practice' | '/listening' | '/telegraph' | '/quiz' | '/progress' | '/translator'
  channel: string
  /** Kunci nama di shellMessages.channels */
  name: keyof (typeof shellMessages)['id']['channels']
  icon: LucideIcon
}

const GROUPS: { label: keyof (typeof shellMessages)['id']['groups']; channels: Channel[] }[] = [
  {
    label: 'practice',
    channels: [
      { to: '/learn', channel: 'CH-01', name: 'learn', icon: GraduationCap },
      { to: '/practice', channel: 'CH-02', name: 'practice', icon: Target },
      { to: '/listening', channel: 'CH-03', name: 'listening', icon: Headphones },
      { to: '/telegraph', channel: 'CH-06', name: 'telegraph', icon: Radio },
      { to: '/quiz', channel: 'CH-04', name: 'quiz', icon: ListChecks },
    ],
  },
  {
    label: 'tools',
    channels: [
      { to: '/progress', channel: 'CH-05', name: 'progress', icon: BarChart3 },
      { to: '/translator', channel: 'TX', name: 'translator', icon: Languages },
    ],
  },
]

const CHANNELS = GROUPS.flatMap((g) => g.channels)

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(to + '/')
}

/** Kerangka semua halaman. Area belajar memakai tema gelap kaca yang sama dengan beranda: sidebar channel, header, dan panel kaca di atas latar hitam-navy. */
export function RadioShell({ user, children }: { user: CurrentUser | null; children: ReactNode }) {
  // Pakai lokasi halaman yang sedang tampil, bukan tujuan navigasi. Selama halaman tujuan dimuat, halaman lama masih
  // dirender; jika kerangka langsung mengikuti tujuan, tata letaknya sempat salah dan halaman tampak berkedip
  const pathname = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).pathname })
  // Sidebar hanya untuk area belajar (route di bawah _authed); halaman publik tidak memakai sidebar
  const authed = useRouterState({ select: (s) => s.matches.some((m) => m.routeId.startsWith('/_authed')) })
  const [open, setOpen] = useState(false)
  const t = useT(shellMessages)
  // Pengaturan akun tidak ada di daftar channel sidebar, tetapi tetap tampil di breadcrumb header
  const channel = CHANNELS.find((c) => isActive(pathname, c.to))
  const current = channel ? { channel: channel.channel, name: t.channels[channel.name] } : isActive(pathname, '/settings') ? { channel: 'SET', name: t.settings } : undefined

  // Drawer mobile tertutup setiap pindah halaman
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const authPage = pathname === '/login' || pathname === '/register'
  const landing = !authed
  // Beranda, login/register, translator, dan halaman game memakai tema gelap kaca yang sama, sehingga header-nya juga gelap
  const home = pathname === '/'
  const dark = home || authPage || pathname === '/translator' || pathname.startsWith('/g/')
  // Menu dropdown dan dialog dirender di luar kerangka (portal ke body), sehingga body ikut memakai tema gelap kaca
  const themed = !landing || dark
  useEffect(() => {
    if (!themed) return
    document.body.classList.add('dark', 'landing')
    return () => document.body.classList.remove('dark', 'landing')
  }, [themed])

  // Garis bawah header halaman publik baru muncul setelah halaman di-scroll
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!landing) return
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [landing])

  // Header halaman publik hanya berisi logo, pemilih bahasa, dan akses akun. Di login/register, akses akun tidak
  // ditampilkan karena form-nya sudah memuat tautan ke halaman akun lainnya
  if (landing)
    return (
      // Login/register setinggi layar tanpa scroll
      <div className={cn('relative isolate flex flex-col overflow-x-clip', authPage ? 'h-dvh overflow-y-hidden' : 'min-h-dvh', dark ? 'dark landing bg-background text-foreground' : 'bg-background')}>
        {/* Halaman gelap selain beranda: cahaya brand dari atas dan grid samar, senada dengan hero */}
        {dark && !home && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(37_99_235/0.2),transparent_70%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_20%,black,transparent)]" />
          </div>
        )}
        {/* Gradasi transparan menyatu dari kiri (biru) ke kanan (cyan), memudar ke bawah */}
        {!dark && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] bg-gradient-to-r from-signal-blue/[0.12] via-[#3b82f6]/[0.08] to-signal-cyan/[0.13] [mask-image:linear-gradient(to_bottom,black_0%,black_35%,transparent_100%)]"
          />
        )}
        <header
          className={cn(
            'sticky top-0 z-40 border-b transition-colors duration-200',
            dark
              ? cn('text-signal-offwhite', scrolled ? 'border-white/[0.07] bg-[#070b14]/70 backdrop-blur-md' : 'border-transparent bg-transparent')
              : scrolled
                ? 'border-border bg-background/75 backdrop-blur-md'
                : 'border-transparent bg-transparent',
          )}
        >
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-signal-cyan" aria-label={t.homeLabel}>
              <SignalLogo size={26} />
              <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Signal</span>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitch />
              {!authPage && <Account user={user} tone={dark ? 'dark' : 'light'} cta />}
            </div>
          </div>
        </header>
        <main id="main" className={cn('flex-1', authPage && 'grid min-h-0 place-items-center pb-16')}>
          {/* Beranda mengatur lebar sendiri karena hero-nya selebar layar. Di login/register, pb-16 mengimbangi tinggi header agar form tepat di tengah layar */}
          {home ? children : <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', !authPage && 'py-8 sm:py-12')}>{children}</div>}
        </main>
      </div>
    )

  return (
    <div className="app-shell dark landing relative isolate min-h-dvh bg-background text-foreground lg:pl-64">
      {/* Latar senada dengan hero beranda: cahaya brand dari atas, pendar cyan samar, dan grid tipis */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(ellipse_55%_50%_at_55%_0%,rgb(37_99_235/0.17),transparent_70%)]" />
        <div className="absolute top-1/2 -right-48 h-[34rem] w-[34rem] rounded-full bg-signal-cyan/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_55%_at_55%_0%,black,transparent)]" />
      </div>

      <aside aria-label={t.sidebar} className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] bg-[#070b14]/70 backdrop-blur-xl lg:block">
        <Sidebar pathname={pathname} user={user} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label={t.closeMenu} onClick={() => setOpen(false)} />
          <aside aria-label={t.sidebar} className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-white/[0.08] bg-[#0a0f1b] shadow-2xl">
            <Sidebar pathname={pathname} user={user} onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070b14]/70 text-signal-offwhite backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              className="-ml-1.5 grid size-9 place-items-center rounded-md text-signal-offwhite/80 hover:bg-white/[0.06] hover:text-signal-offwhite lg:hidden"
              aria-label={t.openMenu}
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-signal-cyan lg:hidden" aria-label={t.homeLabel}>
              <SignalLogo size={24} />
              <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Signal</span>
            </Link>
            {current && (
              <p className="radio-label hidden items-center gap-3 lg:flex">
                <span className="text-signal-cyan">{current.channel}</span>
                <span className="text-signal-offwhite/70">{current.name}</span>
              </p>
            )}
            <div className="ml-auto flex items-center gap-4">
              {/* Indikator frekuensi seperti di bawah hero beranda */}
              <p className="radio-label hidden items-center gap-2 text-signal-offwhite/35 tabular-nums md:flex">
                <SignalLed size="sm" /> TX 7.040 MHz
              </p>
              <span aria-hidden="true" className="hidden h-5 w-px bg-white/10 md:block" />
              <LanguageSwitch />
              <Account user={user} />
            </div>
          </div>
        </header>

        <main id="main" className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ pathname, user, onClose }: { pathname: string; user: CurrentUser | null; onClose?: () => void }) {
  const t = useT(shellMessages)
  return (
    <div className="flex h-full flex-col text-signal-offwhite">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
        <Link to="/" className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-signal-cyan" aria-label={t.homeLabel}>
          <SignalLogo size={26} />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Signal</span>
        </Link>
        {onClose && (
          <button
            className="-mr-1.5 grid size-9 place-items-center rounded-md text-signal-offwhite/70 hover:bg-white/[0.06] hover:text-signal-offwhite"
            aria-label={t.closeMenu}
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav aria-label={t.mainNav} className="flex-1 overflow-y-auto px-3 pt-6 pb-6">
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-7 last:mb-0">
            <p className="radio-label mb-2 px-3 text-signal-offwhite/30">{t.groups[g.label]}</p>
            <ul className="grid gap-0.5">
              {g.channels.map((c) => {
                const active = isActive(pathname, c.to)
                const Icon = c.icon
                return (
                  <li key={c.to}>
                    <Link
                      to={c.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[0.8125rem] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-cyan',
                        active
                          ? 'bg-gradient-to-r from-signal-cyan/[0.1] to-white/[0.02] text-signal-offwhite ring-1 ring-white/[0.06] ring-inset'
                          : 'text-signal-offwhite/55 hover:bg-white/[0.04] hover:text-signal-offwhite',
                      )}
                    >
                      {/* Kanal aktif: garis cyan menyala, seperti garis kanal yang dipilih di beranda */}
                      {active && <span className="absolute inset-y-2 -left-3 w-0.5 rounded-r bg-signal-cyan shadow-[0_0_8px_1px_rgb(6_182_212/0.6)]" aria-hidden="true" />}
                      <Icon className={cn('size-4 shrink-0 transition-colors', active ? 'text-signal-cyan' : 'text-signal-offwhite/40 group-hover:text-signal-offwhite/70')} />
                      <span className="flex-1 truncate font-medium">{t.channels[c.name]}</span>
                      <span className={cn('radio-label text-[0.625rem]', active ? 'text-signal-cyan/80' : 'text-signal-offwhite/25')}>{c.channel}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <Link
            to="/settings"
            aria-current={isActive(pathname, '/settings') ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-cyan',
              isActive(pathname, '/settings') ? 'border-signal-cyan/30 bg-signal-cyan/[0.06]' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]',
            )}
          >
            <UserAvatar name={user.name} image={user.image} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-medium">{user.name}</p>
              <p className="radio-label mt-0.5 flex items-center gap-1.5 text-[0.625rem] text-signal-offwhite/40">
                <SignalLed size="sm" /> {t.operatorStatus}
              </p>
            </div>
            <Settings className="size-4 shrink-0 text-signal-offwhite/35 transition-colors group-hover:text-signal-offwhite/70" aria-hidden="true" />
            <span className="sr-only">{t.settings}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

/** `tone` mengikuti warna header. `cta` dipakai di halaman publik: pengguna yang sudah login cukup diarahkan ke aplikasi. */
function Account({ user, tone = 'dark', cta = false }: { user: CurrentUser | null; tone?: 'dark' | 'light'; cta?: boolean }) {
  const router = useRouter()
  const t = useT(shellMessages)

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  // Di halaman publik, pengguna yang sudah login cukup diarahkan ke area belajar
  if (user && cta)
    return (
      <Button asChild size="sm">
        <Link to="/learn">
          {t.openApp} <ArrowRight className="size-4" />
        </Link>
      </Button>
    )

  if (!user)
    return (
      <>
        <Button asChild variant="ghost" size="sm" className={tone === 'dark' ? 'text-signal-offwhite/75 hover:bg-white/[0.06] hover:text-signal-offwhite' : undefined}>
          <Link to="/login">{t.signIn}</Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/register">{t.signUp}</Link>
        </Button>
      </>
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1 text-[0.8125rem] text-signal-offwhite/80 transition-colors hover:bg-white/[0.06] hover:text-signal-offwhite"
          aria-label={t.accountMenu}
        >
          <UserAvatar name={user.name} image={user.image} className="size-6 text-[0.6875rem]" />
          <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span>{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="size-4" /> {t.settings}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="size-4" /> {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
