import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sentenceCase } from '@/lib/i18n/index.js'
import {
  Card,
  ErrorBox,
  Skeleton,
  SkeletonCard,
  SkeletonCircle,
} from '@/components/ui'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { useAllCharacters } from '@/features/characters/queries.js'
import { useClasses } from '@/features/catalog/queries.js'
import { useUsers } from '@/features/users/queries.js'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import GmCharacterFilters from '../components/GmCharacterFilters.jsx'
import { CHARACTER_SORTS, EMPTY_CHARACTER_FILTERS, filterAndSortCharacters } from '../gmCharacterFilters.js'

function CharacterListItem({ character, playerName, className: classNameName, selected, onEdit }) {
  const navigate = useNavigate()
  const hpPct = character.max_hp > 0 ? Math.max(0, Math.min(100, Math.round((character.current_hp / character.max_hp) * 100))) : 0
  return (
    <div
      className="catalog-record-card gm-character-card"
      data-active={selected}
    >
      <button type="button" aria-pressed={selected} onClick={() => onEdit(character)} className="flex w-full items-center gap-3 text-left">
        <span className="sheet-avatar shrink-0">{(character.name || '?').slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="gm-character-name font-display font-bold text-stone-100">
              {character.name || 'Безымянный'}
            </span>
            <span className="shrink-0 rounded border border-gold/50 px-1.5 py-0.5 font-display text-[10px] font-bold text-gold-light">
              ур. {character.level}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {[playerName, classNameName].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800">
              <span
                className={`block h-full rounded-full ${hpPct > 50 ? 'bg-emerald-600' : hpPct > 25 ? 'bg-ember' : 'bg-red-700'}`}
                style={{ width: `${hpPct}%` }}
              />
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-stone-400">
              {character.current_hp}/{character.max_hp}
            </span>
          </span>
        </span>
      </button>
      <div className="mt-2.5 flex gap-2 border-t border-stone-800 pt-2.5">
        <button
          type="button"
          onClick={() => onEdit(character)}
          className="flex-1 rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800"
        >
          <LoreIcon name="edit" /> Изменить
        </button>
        <button
          type="button"
          onClick={() => navigate(`/characters/${character.id}`, { state: { from: 'gm' } })}
          className="flex-1 rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800"
          title="Открыть лист персонажа как игрок"
        >
          Лист персонажа <LoreIcon name="arrow" />
        </button>
      </div>
    </div>
  )
}

export default function GmCharactersPage() {
  const { data: characters = [], isLoading, error, refetch } = useAllCharacters()
  const { data: users = [] } = useUsers()
  const { data: classes = [] } = useClasses({ size: 100 })

  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState({ ...EMPTY_CHARACTER_FILTERS })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('name')
  const [panelError, setPanelError] = useState(null)

  const userById = useMemo(() => new Map(users.map((u) => [Number(u.id), u])), [users])
  const classById = useMemo(() => new Map(classes.map((c) => [Number(c.id), c])), [classes])

  const playerNameOf = (ownerId) => userById.get(Number(ownerId))?.username ?? `#${ownerId}`
  const subclasses = classes.flatMap((item) => (item.subclasses ?? []).map((subclass) => ({ ...subclass, class_id: item.id })))
  const players = [...new Set(characters.map((character) => Number(character.owner_id)))].map((id) => ({ id, name: playerNameOf(id) }))
  const activeFilters = [
    filters.minLevel && ['minLevel', `От ${filters.minLevel} уровня`],
    filters.maxLevel && ['maxLevel', `До ${filters.maxLevel} уровня`],
    filters.classId && ['classId', sentenceCase(classById.get(Number(filters.classId))?.name ?? `Класс #${filters.classId}`)],
    filters.subclassId && ['subclassId', sentenceCase(subclasses.find((item) => Number(item.id) === Number(filters.subclassId))?.name ?? `Подкласс #${filters.subclassId}`)],
    filters.playerId && ['playerId', playerNameOf(filters.playerId)],
  ].filter(Boolean)

  // Поиск по имени персонажа и по имени игрока одновременно.
  const filtered = useMemo(() => {
    return filterAndSortCharacters(characters, { query: appliedQuery, filters, sort, users })
  }, [characters, appliedQuery, filters, sort, users])

  const reload = async () => {
    await refetch()
  }

  const openEditor = (character) => {
    setSelectedId(character.id)
    setPanelError(null)
  }

  const selectedCharacter = characters.find((c) => c.id === selectedId) ?? null

  if (error && characters.length === 0) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading && characters.length === 0) {
    return (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" aria-busy="true">
        <aside className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="fantasy-panel card-hover space-y-2 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <SkeletonCircle size="size-10" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </aside>
        <section className="min-w-0">
          <SkeletonCard className="min-h-[26rem]" />
        </section>
      </div>
    )
  }

  return (
    <div className="lore-page gm-characters-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Мастерская мира</p><h1 className="heading-section">Персонажи игроков</h1><p className="lore-intro">Герои вашей истории: уровни, пути и состояние персонажей.</p></div></header>
      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setAppliedQuery(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={activeFilters.length} filtersOpen={filtersOpen} label="Поиск персонажей" placeholder="Имя персонажа или игрока…" extraAction={<label className="lore-sort-control" title="Сортировка"><LoreIcon name="sort" /><span aria-hidden="true">{CHARACTER_SORTS.find(([key]) => key === sort)[1]}</span><select aria-label="Сортировка персонажей" value={sort} onChange={(event) => setSort(event.target.value)}>{CHARACTER_SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>} />
        {activeFilters.length > 0 && <div className="lore-active-filters" aria-label="Активные фильтры">{activeFilters.map(([key, label]) => <button key={key} type="button" className="lore-chip lore-chip--active" aria-label={`Убрать фильтр ${label}`} onClick={() => setFilters((current) => ({ ...current, [key]: '', ...(key === 'classId' ? { subclassId: '' } : {}) }))}><span>{label}</span><LoreIcon name="close" /></button>)}<button type="button" className="lore-reset" onClick={() => setFilters({ ...EMPTY_CHARACTER_FILTERS })}>Сбросить фильтры</button></div>}
      </div>
      {filtersOpen && <GmCharacterFilters filters={filters} classes={classes} subclasses={subclasses} players={players} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}

      {error && <ErrorBox error={error} onRetry={refetch} />}

      {!error && (
        <div className={`gm-characters-layout ${selectedCharacter ? 'gm-characters-layout--editing' : ''}`}>
          <aside className="gm-character-list" aria-label="Персонажи игроков">
            {filtered.length === 0 ? (
              <p className="lore-empty">
                {characters.length === 0 ? 'Персонажей пока нет.' : 'По выбранным условиям персонажей не найдено.'}
              </p>
            ) : (
              filtered.map((c) => {
                const cn = classById.get(Number(c.class_id))?.name
                return (
                  <CharacterListItem
                    key={c.id}
                    character={c}
                    playerName={playerNameOf(c.owner_id)}
                    className={[cn, subclasses.find((item) => Number(item.id) === Number(c.subclass_id))?.name].filter(Boolean).map(sentenceCase).join(' · ')}
                    selected={selectedId === c.id}
                    onEdit={openEditor}
                  />
                )
              })
            )}
          </aside>

          {selectedCharacter && <section className="min-w-0">
              <Card className="detail-padded gm-character-editor">
                <div className="gm-character-editor-header">
                <div>
                  <h2 className="heading-section">
                    {selectedCharacter.name || 'Безымянный'}
                  </h2>
                  <p className="mt-1 text-sm text-stone-400">
                    Игрок {playerNameOf(selectedCharacter.owner_id)} · {selectedCharacter.level} уровень · {sentenceCase(classById.get(Number(selectedCharacter.class_id))?.name ?? 'Класс не выбран')}
                  </p>
                </div>
                <div className="gm-character-editor-actions"><Link to={`/characters/${selectedCharacter.id}`} state={{ from: 'gm' }}>Лист персонажа <LoreIcon name="arrow" /></Link><button type="button" aria-label="Закрыть редактор персонажа" onClick={() => setSelectedId(null)}><LoreIcon name="close" /></button></div>
                </div>
                {panelError && (
                  <div className="mb-3">
                    <ErrorBox error={panelError} onRetry={() => setPanelError(null)} />
                  </div>
                )}
                <GmCharacterPanel
                  key={selectedCharacter.id}
                  character={selectedCharacter}
                  onError={setPanelError}
                  reload={reload}
                />
              </Card>
          </section>}
        </div>
      )}
    </div>
  )
}
