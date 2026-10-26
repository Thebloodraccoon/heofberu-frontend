import { useState } from 'react'
import { Button, ErrorBox, Input, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { useTagSearch } from '@/features/articles/queries.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'

// Раздел тегов — как в фильтрах лора: выбранные сверху, поиск по словарю, популярные по умолчанию.
export function TagSection({ legend, hint, selected, onToggle }) {
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const tagsQ = useTagSearch({ search: debounced, sort: 'popular' })
  return (
    <fieldset className="lore-filter-section">
      <legend>{legend}</legend>
      {hint && <p className="lore-filter-hint">{hint}</p>}
      {selected.length > 0 && <div className="lore-filter-options mb-4" aria-label="Выбранные теги">{selected.map((tag) => <button key={tag.id} type="button" className="lore-chip" aria-pressed="true" onClick={() => onToggle(tag)} aria-label={`Убрать тег ${tag.name}`}>#{tag.name} <span aria-hidden="true">×</span></button>)}</div>}
      <Input className="w-full" placeholder="Найти тег…" aria-label="Поиск тегов" value={search} onChange={(event) => setSearch(event.target.value)} />
      <p className="lore-filter-hint">{search ? 'Результаты поиска' : 'Популярные теги'}</p>
      {tagsQ.isLoading && <Skeleton className="h-20 w-full" />}
      {tagsQ.error && <ErrorBox error={tagsQ.error} onRetry={tagsQ.refetch} />}
      <div className="lore-filter-options" aria-busy={tagsQ.isFetching}>{(tagsQ.data?.items ?? []).map((tag) => <button key={tag.id} type="button" className="lore-chip" aria-pressed={selected.some((item) => item.id === tag.id)} onClick={() => onToggle(tag)}>#{tag.name}<span className="text-stone-500">{tag.usage_count}</span></button>)}</div>
      {tagsQ.data?.items.length === 0 && <p className="lore-filter-hint">{search ? 'Таких тегов нет.' : 'Тегов пока нет.'}</p>}
    </fieldset>
  )
}

// Фильтры списков кампаний в боковой панели — тот же вид и поведение, что у фильтров лора:
// правки копятся в черновике, «Применить» отдаёт его целиком, «Сбросить» — пустые значения.
// sections: [{ key, legend, hint, options: [[value, label]], multiple }] или { key, legend, hint, type: 'tags' }.
export default function FilterDrawer({ title, subtitle, sections, value, empty, onApply, onClose }) {
  const [draft, setDraft] = useState(value)
  const toggle = (section, option) => setDraft((current) => {
    if (!section.multiple) return { ...current, [section.key]: option }
    const list = current[section.key] ?? []
    return { ...current, [section.key]: list.includes(option) ? list.filter((item) => item !== option) : [...list, option] }
  })
  const toggleTag = (key, tag) => setDraft((current) => {
    const list = current[key] ?? []
    return { ...current, [key]: list.some((item) => item.id === tag.id) ? list.filter((item) => item.id !== tag.id) : [...list, tag] }
  })
  const apply = (next) => { onApply(next); onClose() }

  return (
    <Drawer variant="filters" title={title} subtitle={subtitle} onClose={onClose} footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={() => apply(empty)}>Сбросить</Button>
        <Button onClick={() => apply(draft)}>Применить</Button>
      </div>
    }>
      {sections.map((section) => section.type === 'tags'
        ? <TagSection key={section.key} legend={section.legend} hint={section.hint} selected={draft[section.key] ?? []} onToggle={(tag) => toggleTag(section.key, tag)} />
        : <fieldset key={section.key} className="lore-filter-section">
          <legend>{section.legend}</legend>
          {section.hint && <p className="lore-filter-hint">{section.hint}</p>}
          <div className="lore-filter-options">{section.options.map(([option, label]) => <button key={String(option)} type="button" className="lore-chip" aria-pressed={section.multiple ? (draft[section.key] ?? []).includes(option) : draft[section.key] === option} onClick={() => toggle(section, option)}>{label}</button>)}</div>
        </fieldset>)}
    </Drawer>
  )
}
