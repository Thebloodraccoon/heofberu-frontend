import { useState } from 'react'
import { ARTICLE_STATUSES, ARTICLE_TYPES } from '@/features/articles/api.js'
import { useArticleSubtypes, useTagSearch } from '@/features/articles/queries.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { useUsers } from '@/features/users/queries.js'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, ErrorBox, Input, Skeleton } from '@/components/ui'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'

// subtypes — выбранные подтипы ({ id, name, article_type }[]); каждый уточняет только свой тип.
// statuses — только в списке ГМ: передан (массив, [] = все) → первым разделом идёт фильтр статусов.
// gm — тоже только в списке ГМ: { author: '' | id, pendingOnly } → раздел «Автор и правки».
// onApply(types, tags, match, subtypes, statuses, gm).
export default function LoreFilters({ types, tags, match, subtypes = [], statuses, gm, onApply, onClose }) {
  const withStatus = statuses !== undefined
  const { user } = useAuth()
  const usersQ = useUsers({ enabled: !!gm })
  const me = user?.id != null ? String(user.id) : ''
  const authors = (usersQ.data ?? []).filter((u) => u.role !== 'player' && String(u.id) !== me)
  const [draftGm, setDraftGm] = useState(gm ?? { author: '', pendingOnly: false })
  const [draftStatuses, setDraftStatuses] = useState(statuses ?? [])
  const toggleStatus = (s) => setDraftStatuses((current) => current.includes(s) ? current.filter((x) => x !== s) : [...current, s])
  const [draftTypes, setDraftTypes] = useState(types)
  const [draftSubtypes, setDraftSubtypes] = useState(subtypes)
  const toggleSubtype = (s) => setDraftSubtypes((current) => current.some((x) => x.id === s.id) ? current.filter((x) => x.id !== s.id) : [...current, s])
  const [subtypeSearch, setSubtypeSearch] = useState('')
  const subtypesQ = useArticleSubtypes()
  const subtypeTerm = subtypeSearch.trim().toLowerCase()
  const subtypeOptions = (subtypesQ.data ?? []).filter(
    (s) => draftTypes.includes(s.article_type) && s.name.toLowerCase().includes(subtypeTerm),
  )
  const [draftTags, setDraftTags] = useState(tags)
  const [draftMatch, setDraftMatch] = useState(match)
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const tagsQ = useTagSearch({ search: debounced, sort: 'popular' })
  const toggleType = (type) => setDraftTypes((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type])
  const toggleTag = (tag) => setDraftTags((current) => current.some((t) => t.id === tag.id) ? current.filter((t) => t.id !== tag.id) : [...current, tag])
  // Подтип имеет смысл только вместе со своим типом: сняли тип — его подтипы тоже уходят.
  const apply = (nextTypes, nextTags, nextMatch, nextSubtypes, nextStatus, nextGm) => {
    onApply(nextTypes, nextTags, nextMatch, nextSubtypes.filter((s) => nextTypes.includes(s.article_type)), nextStatus, nextGm)
    onClose()
  }

  return (
    <Drawer title="Фильтры лора" subtitle="Выберите типы статей и интересующие темы." onClose={onClose} footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={() => apply([], [], 'any', [], [], { author: '', pendingOnly: false })}>Сбросить</Button>
        <Button onClick={() => apply(draftTypes, draftTags, draftMatch, draftSubtypes, draftStatuses, draftGm)}>Применить</Button>
      </div>
    }>
      {withStatus && <fieldset className="lore-filter-section">
        <legend>Статус</legend>
        <p className="lore-filter-hint">Будут показаны статьи любого выбранного статуса. «На проверке» — очередь статей, ждущих основателя.</p>
        <div className="lore-filter-options">
          {ARTICLE_STATUSES.map((s) => <button key={s} type="button" className="lore-chip" aria-pressed={draftStatuses.includes(s)} onClick={() => toggleStatus(s)}>{articleStatusLabels[s]}</button>)}
        </div>
      </fieldset>}
      {gm && <fieldset className="lore-filter-section">
        <legend>Автор и правки</legend>
        <p className="lore-filter-hint">«Ждут решения» — статьи с предложениями правок, которые ещё не приняли и не отклонили.</p>
        <div className="lore-filter-options">
          <button type="button" className="lore-chip" aria-pressed={draftGm.pendingOnly} onClick={() => setDraftGm((g) => ({ ...g, pendingOnly: !g.pendingOnly }))}>Ждут решения</button>
        </div>
        <div className="lore-filter-options mt-3" role="group" aria-label="Автор">
          {[['', 'Все авторы'], ...(me ? [[me, 'Мои статьи']] : []), ...authors.map((u) => [String(u.id), u.username])].map(([id, label]) => (
            <button key={id || 'all'} type="button" className="lore-chip" aria-pressed={draftGm.author === id} onClick={() => setDraftGm((g) => ({ ...g, author: id }))}>{label}</button>
          ))}
        </div>
      </fieldset>}
      <fieldset className="lore-filter-section">
        <legend>Типы статей</legend>
        <p className="lore-filter-hint">Будут показаны статьи любого выбранного типа.</p>
        <div className="lore-filter-options">
          {ARTICLE_TYPES.map((type) => <button key={type} type="button" className="lore-chip" aria-pressed={draftTypes.includes(type)} onClick={() => toggleType(type)}>{articleTypeLabels[type]}</button>)}
        </div>
      </fieldset>
      {draftTypes.length > 0 && <fieldset className="lore-filter-section">
        <legend>Подтип</legend>
        <p className="lore-filter-hint">Подтип уточняет только свой тип: «таверна» у локаций оставит из локаций таверны, остальные выбранные типы — целиком.</p>
        <Input className="w-full" placeholder="Найти подтип…" aria-label="Поиск подтипов" value={subtypeSearch} onChange={(event) => setSubtypeSearch(event.target.value)} />
        {subtypesQ.error && <ErrorBox error={subtypesQ.error} onRetry={subtypesQ.refetch} />}
        <div className="lore-filter-options mt-3">
          {subtypeOptions.map((s) => <button key={s.id} type="button" className="lore-chip" aria-pressed={draftSubtypes.some((x) => x.id === s.id)} onClick={() => toggleSubtype(s)}>{s.name}{draftTypes.length > 1 && <span className="text-stone-500">{articleTypeLabels[s.article_type]}</span>}</button>)}
        </div>
        {subtypesQ.data && subtypeOptions.length === 0 && <p className="lore-filter-hint">{subtypeTerm ? 'Таких подтипов нет.' : 'У выбранных типов подтипов пока нет.'}</p>}
      </fieldset>}
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
