import { useMemo, useState } from 'react'

const norm = (v) => String(v ?? '').toLowerCase()

export function useSearch(items, keys = ['name', 'description']) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items ?? []
    const terms = q.split(/\s+/)
    return (items ?? []).filter((it) => {
      const haystack = keys.map((k) => norm(it?.[k])).join(' ')
      return terms.every((t) => haystack.includes(t))
    })
  }, [items, query, keys])

  return { query, setQuery, filtered }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function highlightParts(text, query) {
  const raw = String(text ?? '')
  const q = query.trim()
  if (!q) return [{ text: raw, match: false }]
  const parts = []
  const re = new RegExp(`(${q.split(/\s+/).map(escapeRegExp).join('|')})`, 'ig')
  let last = 0
  for (const m of raw.matchAll(re)) {
    if (m.index > last) parts.push({ text: raw.slice(last, m.index), match: false })
    parts.push({ text: m[0], match: true })
    last = m.index + m[0].length
  }
  if (last < raw.length) parts.push({ text: raw.slice(last), match: false })
  return parts
}

