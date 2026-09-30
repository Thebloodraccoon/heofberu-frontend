import { useState } from 'react'
import { ARTICLE_TYPES } from '@/features/articles/api.js'
import { useTagSearch } from '@/features/articles/queries.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, ErrorBox, Input, Skeleton } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

export default function LoreFilters({ types, tags, match, onApply, onClose }) {
  const [draftTypes, setDraftTypes] = useState(types)
  const [draftTags, setDraftTags] = useState(tags)
  const [draftMatch, setDraftMatch] = useState(match)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const tagsQ = useTagSearch({ search: debounced, sort: 'popular' })
  const toggleType = (type) => setDraftTypes((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type])
  const toggleTag = (tag) => setDraftTags((current) => current.some((t) => t.id === tag.id) ? current.filter((t) => t.id !== tag.id) : [...current, tag])
  const apply = (nextTypes, nextTags, nextMatch) => {
    onApply(nextTypes, nextTags, nextMatch)
    onClose()
  }

  return (
    <Drawer title="Фильтры лора" subtitle="Выберите типы статей и интересующие темы." onClose={onClose} footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={() => apply([], [], 'any')}>Сбросить</Button>
        <Button onClick={() => apply(draftTypes, draftTags, draftMatch)}>Применить</Button>
      </div>
    }>
      <fieldset className="lore-filter-section">
        <legend>Типы статей</legend>
        <p className="lore-filter-hint">Будут показаны статьи любого выбранного типа.</p>
        <div className="lore-filter-options">
          {ARTICLE_TYPES.map((type) => <button key={type} type="button" className="lore-chip" aria-pressed={draftTypes.includes(type)} onClick={() => toggleType(type)}>{articleTypeLabels[type]}</button>)}
        </div>
      </fieldset>
      <fieldset className="lore-filter-section">
        <legend>Теги</legend>
        {draftTags.length > 0 && <div className="lore-filter-options mb-4" aria-label="Выбранные теги">
          {draftTags.map((tag) => <button key={tag.id} type="button" className="lore-chip" aria-pressed="true" onClick={() => toggleTag(tag)} aria-label={`Убрать тег ${tag.name}`}>#{tag.name} <span aria-hidden="true">×</span></button>)}
        </div>}
        <Input className="w-full" placeholder="Найти тег…" aria-label="Поиск тегов" value={search} onChange={(event) => setSearch(event.target.value)} />
        {draftTags.length > 1 && <label className="lore-match"><input type="checkbox" checked={draftMatch === 'all'} onChange={(event) => setDraftMatch(event.target.checked ? 'all' : 'any')} />Статья должна содержать все выбранные теги</label>}
        <p className="lore-filter-hint">{search ? 'Результаты поиска' : 'Популярные теги'}</p>
        {tagsQ.isLoading && <Skeleton className="h-20 w-full" />}
        {tagsQ.error && <ErrorBox error={tagsQ.error} onRetry={tagsQ.refetch} />}
        <div className="lore-filter-options" aria-busy={tagsQ.isFetching}>
          {(tagsQ.data?.items ?? []).map((tag) => <button key={tag.id} type="button" className="lore-chip" aria-pressed={draftTags.some((t) => t.id === tag.id)} onClick={() => toggleTag(tag)}>#{tag.name}<span className="text-stone-500">{tag.usage_count}</span></button>)}
        </div>
        {tagsQ.data?.items.length === 0 && <p className="lore-filter-hint">{search ? 'Таких тегов нет.' : 'Тегов пока нет.'}</p>}
        {tagsQ.data?.total > tagsQ.data?.items.length && <p className="lore-filter-hint">Показаны {tagsQ.data.items.length} из {tagsQ.data.total}. Уточните поиск, чтобы найти остальные.</p>}
      </fieldset>
    </Drawer>
  )
}
