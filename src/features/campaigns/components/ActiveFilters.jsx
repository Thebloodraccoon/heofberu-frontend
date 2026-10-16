import { Button } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

// Чипы применённых фильтров под поиском и «Сбросить фильтры» — как в лоре. chips: [[key, label, onRemove]].
export default function ActiveFilters({ chips, onReset }) {
  if (chips.length === 0) return null
  return (
    <div className="lore-active-filters" aria-label="Активные фильтры">
      {chips.map(([key, label, onRemove]) => <button key={key} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать фильтр ${label}`} onClick={onRemove}><span>{label}</span><LoreIcon name="close" /></button>)}
      <button type="button" className="lore-reset" onClick={onReset}>Сбросить фильтры</button>
    </div>
  )
}

// Для списков без текстового поиска — та же кнопка «Фильтры», что в SearchToolbar.
export function FiltersButton({ count, open, onClick }) {
  return (
    <Button type="button" variant="ghost" className="ui-search-filter" aria-haspopup="dialog" aria-expanded={open} onClick={onClick}>
      <svg className="ui-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg><span>Фильтры</span>{count > 0 && <span className="ui-search-count">{count}</span>}
    </Button>
  )
}
