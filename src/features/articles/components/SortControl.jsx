import SortMenu from '@/components/ui/SortMenu.jsx'
import { ARTICLE_SORTS } from '@/features/articles/sorts.js'
import LoreIcon from './LoreIcon.jsx'

// Сортировка списка статей (лор и мастерская). При поиске от 2 символов порядок задаёт релевантность.
export default function SortControl({ value, onChange, searching = false }) {
  if (searching) return <span className="lore-sort-relevance"><LoreIcon name="sort" />По релевантности</span>
  return <SortMenu options={ARTICLE_SORTS} value={value} onChange={onChange} />
}
