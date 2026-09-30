import { Button } from './primitives.jsx'

function Icon({ path }) {
  return <svg className="ui-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={path} /></svg>
}

export default function SearchToolbar({ query, onQueryChange, onSearch, onFilters, filterCount = 0, filtersOpen = false, filterLabel, label = 'Поиск', placeholder = 'Поиск…', submitLabel = 'Найти', extraAction, className = '' }) {
  return (
    <form role="search" className={`ui-search-form ${className}`} onSubmit={(event) => { event.preventDefault(); onSearch() }}>
      <div className="ui-search-field">
        <Icon path="m21 21-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0" />
        <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} aria-label={label} />
        <button type="submit" className="ui-search-submit" aria-label={submitLabel}><Icon path="M5 12h14m-6-6 6 6-6 6" /></button>
      </div>
      <Button type="button" variant="ghost" className="ui-search-filter" aria-label={filterLabel} aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={onFilters}>
        <Icon path="M4 7h16M7 12h10M10 17h4" /><span>Фильтры</span>{filterCount > 0 && <span className="ui-search-count">{filterCount}</span>}
      </Button>
      {extraAction}
    </form>
  )
}
