import { useState } from 'react'

export function useSearch(items, key = 'name') {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const filtered = q
    ? (items ?? []).filter((it) => String(it[key] ?? '').toLowerCase().includes(q))
    : items ?? []
  return { query, setQuery, filtered }
}
