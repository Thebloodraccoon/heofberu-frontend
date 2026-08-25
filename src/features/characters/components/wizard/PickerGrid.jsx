import { OptionCard } from './OptionCard.jsx'
import { Hint, Search } from './StepShell.jsx'
import Highlight from './Highlight.jsx'

export default function PickerGrid({
  items,
  query,
  onQueryChange,
  searchPlaceholder = 'Поиск…',
  selectedId,
  onSelect,
  columns = 'sm:grid-cols-3 xl:grid-cols-4',
  subtitleOf,
  descriptionOf,
  emptyText = 'Ничего не найдено.',
  isDisabled,
  children,
}) {
  return (
    <div>
      <Search
        className="mb-3 max-w-sm"
        placeholder={searchPlaceholder}
        value={query}
        onChange={onQueryChange}
      />
      <div className={`grid gap-2.5 ${columns}`}>
        {items.map((it) => {
          const selected = String(it.id) === String(selectedId)
          const subtitle = subtitleOf?.(it)
          const description = query.trim() ? descriptionOf?.(it) : null
          return (
            <OptionCard
              key={it.id}
              selected={selected}
              disabled={isDisabled?.(it)}
              onClick={() => onSelect(it)}
              title={<Highlight text={it.name} query={query} />}
              subtitle={
                subtitle || description ? (
                  <>
                    {subtitle}
                    {subtitle && description ? ' · ' : ''}
                    {description && (
                      <span className="block truncate text-stone-500" title={it.description ?? ''}>
                        <Highlight text={(it.description ?? '').slice(0, 80)} query={query} />
                      </span>
                    )}
                  </>
                ) : undefined
              }
            >
              {children?.(it)}
            </OptionCard>
          )
        })}
        {items.length === 0 && <Hint>{emptyText}</Hint>}
      </div>
    </div>
  )
}
