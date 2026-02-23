import { useState, useCallback } from 'react'

/**
 * localStorage-backed state hook — drop-in replacement for @github/spark useKV.
 * Works both in Electron and plain browser contexts without any auth requirement.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        window.localStorage.setItem(key, JSON.stringify(next))
        return next
      })
    } catch {
      // ignore write errors (e.g. private browsing quota)
    }
  }, [key])

  return [storedValue, setValue]
}
