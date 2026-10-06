import { useEffect, useState } from 'react'

// Значение, которое догоняет value через delay мс после последнего изменения —
// чтобы поиск тегов не слал запрос на каждую нажатую букву.
export default function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
