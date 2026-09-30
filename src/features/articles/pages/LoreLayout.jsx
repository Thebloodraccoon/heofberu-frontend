import { useLayoutEffect, useState } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import LoreFilters from '@/features/articles/components/LoreFilters.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { parseSubtypeIds, parseTagIds, parseTypes } from '@/features/articles/filters.js'
import { ARTICLE_SORTS } from '@/features/articles/sorts.js'
import { useArticleBySlug, useArticleSubtypes, useRememberTags, useTagsByIds } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import { articleTypeLabels } from '@/lib/i18n'

const PLAYER_VIEW_KEY = 'lore:player-view'

const readPlayerView = () => {
  try {
    return sessionStorage.getItem(PLAYER_VIEW_KEY) === '1'
  } catch {
    return false
  }
}

const activeChip = 'lore-chip lore-chip--active'

// Поиск и фильтры показываются в списке; переключатель режима игрока доступен
// и в списке, и в деталях. Режим передаётся дочерним страницам через Outlet.
export default function LoreLayout() {
  const [params, setParams] = useSearchParams()
  const { isGM } = useAuth()

  // ГМ может посмотреть лор так, как его видит игрок: без неопубликованных и секретных
  // статей/связей и блоков :::gm. Флаг живёт в layout (не сбрасывается при переходе
  // к статье) и в sessionStorage (переживает перезагрузку вкладки).
  const [playerViewRaw, setPlayerViewRaw] = useState(readPlayerView)
  const playerView = isGM && playerViewRaw
  const togglePlayerView = () => {
    const next = !playerViewRaw
    setPlayerViewRaw(next)
    try {
      sessionStorage.setItem(PLAYER_VIEW_KEY, next ? '1' : '0')
    } catch {
      // приватный режим / выключенное хранилище — просто не запоминаем
    }
  }

  const q = params.get('q') ?? ''
  const types = parseTypes(params)
  const tagIds = parseTagIds(params)
  const matchAll = params.get('match') === 'all'
  const subtypeIds = parseSubtypeIds(params)
  const subtypesQ = useArticleSubtypes()
  const selectedSubtypes = subtypeIds.map((id) => (subtypesQ.data ?? []).find((s) => s.id === id) ?? { id, name: `#${id}` })
  const selectedTags = useTagsByIds(tagIds)
  const rememberTags = useRememberTags()
  const [showFilters, setShowFilters] = useState(false)

  const [input, setInput] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setInput(q)
  }

  const location = useLocation()
  const onList = location.pathname.replace(/\/+$/, '') === '/lore'
  // Статья открыта по slug; id для ссылки «Редактировать» берём из той же (кэшированной) загрузки.
  const openSlug = onList ? null : decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) ?? '')
  const openArticle = useArticleBySlug(isGM ? openSlug : null)

  useLayoutEffect(() => {
    if (!onList) window.scrollTo(0, 0)
  }, [location.pathname, onList])

  // Фильтры меняют параметры URL списка.
  const updateParams = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const submit = () => updateParams({ q: input.trim() })

  // Сняли тип — снимаем и его подтипы.
  const setTypes = (next) => updateParams({
    type: next.join(','),
    subtype: selectedSubtypes.filter((s) => !s.article_type || next.includes(s.article_type)).map((s) => s.id).join(','),
  })
  const setTags = (ids) => updateParams({ tags: ids.join(','), match: ids.length > 1 && matchAll ? 'all' : '' })

  // Текст поиска и так виден в поле — в строке активных фильтров только типы и теги.
  const hasFilters = types.length > 0 || tagIds.length > 0 || subtypeIds.length > 0

  const filterCount = types.length + tagIds.length + subtypeIds.length
  const sort = ARTICLE_SORTS.some(([key]) => key === params.get('sort')) ? params.get('sort') : 'newest'
  const sortLabel = ARTICLE_SORTS.find(([key]) => key === sort)[1]
  const setSort = (value) => updateParams({ sort: value === 'newest' ? '' : value })
  const playerToggle = isGM && <button type="button" className="lore-player-switch" role="switch" aria-checked={playerView} onClick={togglePlayerView}>
    <LoreIcon name="eye" /> Глазами игрока <span className="lore-switch-track" aria-hidden="true" />
  </button>

  return (
    <div className={`lore-page ${onList ? 'lore-page--list' : 'lore-page--reading'}`}>
      {onList ? (
        <header className="lore-header lore-list-header">
          <div>
            <p className="lore-eyebrow">Библиотека мира</p>
            <h1 className="heading-section">Лор</h1>
            <div className="lore-intro-row">
              <p className="lore-intro">Народы, земли и истории Хеофберу.</p>
              {isGM && <div className="lore-list-actions">{playerToggle}<Link to="/gm/articles" className="lore-editor-link">Редактор статей <LoreIcon name="arrow" /></Link></div>}
            </div>
          </div>
        </header>
      ) : (
        <div className="lore-reading-toolbar">
          <Link to={{ pathname: '/lore', search: location.search }}><LoreIcon name="back" /> Ко всем статьям</Link>
          <div className="lore-reading-actions">
            {playerToggle}
            {isGM && openArticle.data && <Link to={`/gm/articles?id=${openArticle.data.id}`} className="lore-editor-link">Редактировать <LoreIcon name="arrow" /></Link>}
          </div>
        </div>
      )}
      {!onList && playerView && <p className="lore-preview-notice">Глазами игрока: неопубликованные статьи и секреты скрыты.</p>}

      {onList && playerView && <p className="lore-preview-notice">Глазами игрока: неопубликованные статьи и секреты скрыты.</p>}
      {onList && <div id="lore-search-panel" className="lore-search-panel">
        <SearchToolbar
          className="lore-search-toolbar"
          query={input} onQueryChange={setInput} onSearch={submit}
          onFilters={() => setShowFilters(true)} filterCount={filterCount} filtersOpen={showFilters}
          label="Поиск по статьям" placeholder="Поиск по статьям…" submitLabel="Найти статьи"
          extraAction={q.trim().length < 2 ? (
            <label className="lore-sort-control" title={`Сортировка: ${sortLabel}`}>
              <LoreIcon name="sort" /><span aria-hidden="true">{sortLabel}</span>
              <select aria-label="Сортировка" value={sort} onChange={(event) => setSort(event.target.value)}>
                {ARTICLE_SORTS.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
              </select>
            </label>
          ) : <span className="lore-sort-relevance"><LoreIcon name="sort" />По релевантности</span>}
        />
        {hasFilters && <div className="lore-active-filters" aria-label="Активные фильтры">
          {types.map((type) => <button key={type} type="button" className={activeChip} aria-label={`Убрать тип ${articleTypeLabels[type]}`} onClick={() => setTypes(types.filter((t) => t !== type))}><span>{articleTypeLabels[type]}</span><LoreIcon name="close" /></button>)}
          {selectedSubtypes.map((s) => <button key={s.id} type="button" className={activeChip} aria-label={`Убрать подтип ${s.name}`} onClick={() => updateParams({ subtype: subtypeIds.filter((id) => id !== s.id).join(',') })}><span>{s.name}</span><LoreIcon name="close" /></button>)}
          {selectedTags.map((tag) => <button key={tag.id} type="button" className={activeChip} aria-label={`Убрать тег ${tag.name}`} onClick={() => setTags(tagIds.filter((id) => id !== tag.id))}><span>#{tag.name}</span><LoreIcon name="close" /></button>)}
          {matchAll && tagIds.length > 1 && <span className="text-xs text-stone-500">Все выбранные теги</span>}
          <button type="button" className="lore-reset" onClick={() => updateParams({ type: '', subtype: '', tags: '', match: '' })}>Сбросить фильтры</button>
        </div>}
      </div>}

      {showFilters && <LoreFilters types={types} tags={selectedTags} match={matchAll ? 'all' : 'any'} subtypes={selectedSubtypes} onClose={() => setShowFilters(false)} onApply={(nextTypes, tags, match, subtypes) => {
        rememberTags(tags)
        updateParams({ type: nextTypes.join(','), subtype: subtypes.map((s) => s.id).join(','), tags: tags.map((tag) => tag.id).join(','), match: tags.length > 1 && match === 'all' ? 'all' : '' })
      }} />}
      <Outlet context={{ gmView: isGM && !playerView, playerView }} />
    </div>
  )
}
