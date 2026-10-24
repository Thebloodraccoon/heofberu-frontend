import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import SortMenu from '@/components/ui/SortMenu.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import ActiveFilters from '@/features/campaigns/components/ActiveFilters.jsx'
import FilterDrawer from '@/features/campaigns/components/FilterDrawer.jsx'
import { FULL_PAGE } from '@/features/campaigns/api.js'
import { useCampaignsPage, useSchedule } from '@/features/campaigns/queries.js'
import { useBackgrounds, useClasses, useRaces } from '@/features/catalog/queries.js'
import { useDeleteCharacter, useMyCharacters } from '@/features/characters/queries.js'
import { sentenceCase } from '@/lib/i18n/index.js'

const CHARACTER_SORTS = [['name', 'По имени'], ['level-desc', 'Уровень: по убыванию'], ['next-session', 'Ближайшая игра']]
const EMPTY_FILTERS = { participation: '' }
const FILTER_SECTIONS = [
  { key: 'participation', legend: 'Участие', hint: 'В кампанию персонажа добавляет ГМ стола — сам игрок туда не записывается.', options: [['', 'Все персонажи'], ['playing', 'В игре'], ['free', 'Свободные']] },
]
const PARTICIPATION_LABELS = { playing: 'В игре', free: 'Свободные' }

// Плитка персонажа — как до кампаний; из кампаний только быстрый переход к его игровому столу рядом с кнопкой удаления.
function CharacterCard({ character, identity, table, onDelete }) {
  return (
    <div className="catalog-tile relative">
      <div className="absolute bottom-2.5 right-2 z-10 flex items-center gap-1.5">
        {table && <Link className="lore-chip whitespace-nowrap" to={`/campaigns/${table.id}`} title={`«${table.title}»`}>Игровой стол <LoreIcon name="arrow" /></Link>}
        <button type="button" onClick={() => onDelete(character)} title="Удалить персонажа" aria-label={`Удалить персонажа ${character.name}`} className="rounded border border-stone-700 bg-stone-900/80 p-1.5 text-stone-500 transition hover:border-red-800 hover:bg-red-950/50 hover:text-red-300"><LoreIcon name="trash" /></button>
      </div>
      <Link to={`/characters/${character.id}`} className="group block">
        <div className="list-row">
          <p className="item-name group-hover:text-ember">{character.name}</p>
          <Badge tone="accent">Ур. {character.level}</Badge>
        </div>
        <p className="text-hint mt-1">{identity || 'Без класса'}</p>
        <p className={`mt-3 text-sm ${table ? 'pr-48' : 'pr-9'}`}>
          <span className="text-stone-400">HP </span>
          <span className="font-semibold text-stone-200">{character.current_hp} / {character.max_hp}</span>
          {character.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{character.temp_hp})</span>}
        </p>
      </Link>
    </div>
  )
}

// Личный кабинет игрока: персонажи, у каждого — быстрый переход к его игровому столу.
// Список столов игрока — «Мои игры», полное расписание — отдельной страницей; столы ГМ — в «Игровых столах».
export default function CharactersPage() {
  const navigate = useNavigate()
  const { data: characters = [], isLoading, error, refetch } = useMyCharacters()
  const { data: races = [] } = useRaces({ size: 100 })
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: backgrounds = [] } = useBackgrounds({ size: 100 })
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState('name')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const deleteCharacter = useDeleteCharacter()
  const { data: campaignPage } = useCampaignsPage({ role: 'player', size: FULL_PAGE })
  const { data: schedulePage } = useSchedule({ role: 'player', size: FULL_PAGE })
  const campaigns = useMemo(() => campaignPage?.items ?? [], [campaignPage])
  const sessions = useMemo(() => schedulePage?.items ?? [], [schedulePage])

  // character_id → текущий стол; campaign_id → ближайшая запланированная сессия (для сортировки «Ближайшая игра»).
  const tables = useMemo(() => {
    const current = new Map()
    for (const campaign of campaigns) {
      for (const mine of campaign.my_characters ?? []) if (mine.status === 'active') current.set(mine.character_id, campaign)
    }
    return current
  }, [campaigns])
  const nextByCampaign = useMemo(() => {
    const next = new Map()
    for (const session of sessions) if (session.status === 'planned' && !next.has(session.campaign.id)) next.set(session.campaign.id, session)
    return next
  }, [sessions])

  const identityOf = (character) => {
    const cls = classes.find((item) => item.id === character.class_id)
    const subclass = cls?.subclasses?.find((item) => String(item.id) === String(character.subclass_id))
    return [cls?.name, subclass?.name, races.find((item) => item.id === character.race_id)?.name, backgrounds.find((item) => item.id === character.background_id)?.name].filter(Boolean).map(sentenceCase).join(' · ')
  }

  const visible = useMemo(() => {
    const term = appliedQuery.toLocaleLowerCase('ru')
    const nextTime = (character) => { const table = tables.get(character.id); const session = table && nextByCampaign.get(table.id); return session ? new Date(session.scheduled_at).getTime() : Infinity }
    return characters
      .filter((character) => !term || (character.name ?? '').toLocaleLowerCase('ru').includes(term))
      .filter((character) => filters.participation === '' || (filters.participation === 'playing') === tables.has(character.id))
      .sort((a, b) => (sort === 'level-desc' ? b.level - a.level : sort === 'next-session' ? nextTime(a) - nextTime(b) : 0) || (a.name ?? '').localeCompare(b.name ?? '', 'ru') || a.id - b.id)
  }, [characters, appliedQuery, filters, sort, tables, nextByCampaign])

  const chips = [
    filters.participation && ['participation', PARTICIPATION_LABELS[filters.participation], () => setFilters((current) => ({ ...current, participation: '' }))],
  ].filter(Boolean)
  const doDelete = () => deleteCharacter.mutate(confirmTarget.id, { onSuccess: () => setConfirmTarget(null) })

  return (
    <div className="lore-page player-games-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Личный кабинет</p><h1 className="heading-section">Мои персонажи</h1><p className="lore-intro">Ваши герои — и куда перейти, чтобы сыграть ими.</p></div><div className="flex flex-wrap gap-2"><Link className="lore-chip" to="/campaigns"><LoreIcon name="book" />Мои игры</Link><Link className="lore-chip" to="/schedule"><LoreIcon name="history" />Расписание</Link><Button onClick={() => navigate('/characters/new')}><LoreIcon name="plus" />Новый персонаж</Button></div></header>

      <div className="lore-search-panel">
        <SearchToolbar className="lore-search-toolbar" query={query} onQueryChange={setQuery} onSearch={() => setAppliedQuery(query.trim())} onFilters={() => setFiltersOpen(true)} filterCount={chips.length} filtersOpen={filtersOpen} label="Поиск персонажей" placeholder="Имя персонажа…" extraAction={<SortMenu options={CHARACTER_SORTS} value={sort} onChange={setSort} label="Сортировка персонажей" />} />
        <ActiveFilters chips={chips} onReset={() => setFilters(EMPTY_FILTERS)} />
      </div>
      {filtersOpen && <FilterDrawer title="Фильтры персонажей" subtitle="Кто в игре и где играл раньше." sections={FILTER_SECTIONS} value={filters} empty={EMPTY_FILTERS} onApply={setFilters} onClose={() => setFiltersOpen(false)} />}

      {error && <ErrorBox error={error} onRetry={refetch} />}
      {!error && isLoading && <div className="player-characters" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32 w-full" />)}</div>}
      {!error && !isLoading && (visible.length === 0
        ? <p className="lore-empty">{characters.length === 0 ? 'Персонажей пока нет — создайте первого.' : 'По выбранным условиям персонажей нет.'}</p>
        : <section className="player-characters" aria-label="Мои персонажи">{visible.map((character) => {
          const table = tables.get(character.id)
          return <CharacterCard key={character.id} character={character} identity={identityOf(character)} table={table} onDelete={setConfirmTarget} />
        })}</section>)}

      {confirmTarget && <ConfirmDialog title="Удалить персонажа?" message={`Персонаж «${confirmTarget.name}» (ур. ${confirmTarget.level}) будет удалён безвозвратно вместе со всеми своими данными.`} busy={deleteCharacter.isPending} error={deleteCharacter.error} onCancel={() => { setConfirmTarget(null); deleteCharacter.reset() }} onConfirm={doDelete} />}
    </div>
  )
}
