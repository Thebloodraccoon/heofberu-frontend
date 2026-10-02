import { ARTICLE_SORTS } from '@/features/articles/sorts.js'
import LoreIcon from './LoreIcon.jsx'

// Сортировка списка статей (лор и мастерская). При поиске от 2 символов порядок задаёт релевантность.
export default function SortControl({ value, onChange, searching = false }) {
  if (searching) return <span className="lore-sort-relevance"><LoreIcon name="sort" />По релевантности</span>
  const label = ARTICLE_SORTS.find(([key]) => key === value)?.[1] ?? ARTICLE_SORTS[0][1]
  return (
    <label className="lore-sort-control" title={`Сортировка: ${label}`}>
      <LoreIcon name="sort" /><span aria-hidden="true">{label}</span>
      <select aria-label="Сортировка" value={value} onChange={(event) => onChange(event.target.value)}>
        {ARTICLE_SORTS.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>
    </label>
  )
}
