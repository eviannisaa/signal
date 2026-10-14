import { useCallback, useEffect, useState } from 'react'

/**
 * State yang diingat di localStorage. Nilai dibaca setelah mount (aman untuk SSR) dan
 * selalu divalidasi lewat `parse`. Jika localStorage tidak tersedia, state tetap berjalan.
 */
export function useStoredState<T>(key: string, parse: (raw: unknown) => T, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) setValue(parse(JSON.parse(raw)))
    } catch {
      // localStorage tidak tersedia atau nilainya rusak: pakai nilai awal
    }
    setReady(true)
    // parse dianggap stabil (fungsi di level modul)
  }, [key])

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Mode private browser: pilihan hanya berlaku untuk sesi ini
      }
    },
    [key],
  )

  return [value, update, ready] as const
}
