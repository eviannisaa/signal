import { useEffect, useState } from 'react'

/** Nilai yang baru diperbarui setelah input berhenti berubah selama `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
