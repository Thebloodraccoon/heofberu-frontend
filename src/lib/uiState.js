import { useCallback, useState } from 'react'

const PREFIX = 'heofberu-ui'

const load = (key, defaults) => {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}:${key}`)
    if (raw === null) return defaults ?? []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : defaults ?? []
  } catch {
    return defaults ?? []
  }
}

/**
 * Множество «открытых» элементов аккордеонов, живущее в localStorage:
 * сохраняется при переключении вкладок и перезагрузке страницы.
 */
export function useUiSet(key, defaults = []) {
  const [items, setItems] = useState(() => load(key, defaults))

  const toggle = useCallback(
    (k) => {
      setItems((prev) => {
        const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
        try {
          window.localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(next))
        } catch {
          /* localStorage недоступен */
        }
        return next
      })
    },
    [key],
  )

  return [items, toggle]
}
