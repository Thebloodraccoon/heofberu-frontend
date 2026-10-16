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
import { campaignCharacterStatusLabels, sentenceCase } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'

const CHARACTER_SORTS = [['name', 'По имени'], ['level-desc', 'Уровень: по убыванию'], ['next-session', 'Ближайшая игра']]
const EMPTY_FILTERS = { participation: '', history: 'hide' }
const FILTER_SECTIONS = [
  { key: 'participation', legend: 'Участие', hint: 'В кампанию персонажа добавляет ГМ стола — сам игрок туда не записывается.', options: [['', 'Все персонажи'], ['playing', 'В игре'], ['free', 'Свободные']] },
  { key: 'history', legend: 'Прошлые кампании', hint: 'Кампании, где персонаж погиб или ушёл на покой, в том числе архивные.', options: [['hide', 'Скрывать'], ['show', 'Показывать']] },
]
const PARTICIPATION_LABELS = { playing: 'В игре', free: 'Свободные' }

function CharacterCard({ character, identity, table, pastTables, nextSession, onDelete }) {
  return (
    <article className="catalog-record-card player-character-card">
      <div className="flex items-start gap-3">
        <span className="sheet-avatar shrink-0" aria-hidden="true">{(character.name || '?').slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <Link to={`/characters/${character.id}`} className="flex flex-wrap items-center gap-2"><span className="font-display font-bold text-stone-100">{character.name}</span><Badge tone="accent">Ур. {character.level}</Badge></Link>
          <p className="truncate text-xs text-stone-400">{identity || 'Без класса'} · HP {character.current_hp}/{character.max_hp}{character.temp_hp > 0 && ` (+${character.temp_hp})`}</p>
        </div>
        <button type="button" className="lore-chip" aria-label={`Удалить персонажа ${character.name}`} title="Удалить персонажа" onClick={() => onDelete(character)}><LoreIcon name="trash" /></button>
      </div>
      <div className="player-character-game">
        {table
          ? <><p className="text-sm"><span className="text-stone-400">Играет в </span><Link className="link-ember" to={`/campaigns/${table.id}`}>«{table.title}»</Link><span className="text-stone-400"> · ГМ {table.owner?.username ?? 'аккаунт удалён'}</span></p>
            <p className="text-hint">{nextSession ? <>Следующая сессия: <Link className="link-ember" to={`/campaigns/${table.id}/sessions/${nextSession.id}`}>{formatDateTime(nextSession.scheduled_at)}{nextSession.title && ` · ${nextSession.title}`}</Link></> : 'Дата следующей сессии пока не назначена.'}</p></>
          : <p className="text-hint">Свободен: ни в одной кампании. Добавить его в игру может ГМ стола.</p>}
        {pastTables.length > 0 && <p className="text-hint">Раньше: {pastTables.map(({ campaign, status }, index) => <span key={campaign.id}>{index > 0 && ', '}<Link className="link-ember" to={`/campaigns/${campaign.id}`}>«{campaign.title}»</Link> ({campaignCharacterStatusLabels[status].toLowerCase()})</span>)}</p>}
      </div>
    </article>
  )
}

// Личный кабинет игрока: персонажи вместе с кампаниями, где они играют, и ближайшей сессией каждого стола.
// Полное расписание — отдельной страницей; столы, которые пользователь ведёт как ГМ, — в «Игровых столах».
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
  const showHistory = filters.history === 'show'
  const { data: campaignPage } = useCampaignsPage({ role: 'player', size: FULL_PAGE, include_archived: showHistory || undefined })
  const { data: schedulePage } = useSchedule({ role: 'player', size: FULL_PAGE })
  const campaigns = useMemo(() => campaignPage?.items ?? [], [campaignPage])
  const sessions = useMemo(() => schedulePage?.items ?? [], [schedulePage])

  // character_id → текущий стол и прошлые; campaign_id → ближайшая запланированная сессия.
  const tables = useMemo(() => {
    const current = new Map()
    const past = new Map()
    for (const campaign of campaigns) {
      for (const mine of campaign.my_characters ?? []) {
        if (mine.status === 'active') current.set(mine.character_id, campaign)
        else past.set(mine.character_id, [...(past.get(mine.character_id) ?? []), { campaign, status: mine.status }])
      }
    }
    return { current, past }
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
    const nextTime = (character) => { const table = tables.current.get(character.id); const session = table && nextByCampaign.get(table.id); return session ? new Date(session.scheduled_at).getTime() : Infinity }
    return characters
      .filter((character) => !term || (character.name ?? '').toLocaleLowerCase('ru').includes(term))
      .filter((character) => filters.participation === '' || (filters.participation === 'playing') === tables.current.has(character.id))
      .sort((a, b) => (sort === 'level-desc' ? b.level - a.level : sort === 'next-session' ? nextTime(a) - nextTime(b) : 0) || (a.name ?? '').localeCompare(b.name ?? '', 'ru') || a.id - b.id)
  }, [characters, appliedQuery, filters, sort, tables, nextByCampaign])

  const chips = [
    filters.participation && ['participation', PARTICIPATION_LABELS[filters.participation], () => setFilters((current) => ({ ...current, participation: '' }))],
    showHistory && ['history', 'С прошлыми кампаниями', () => setFilters((current) => ({ ...current, history: 'hide' }))],
  ].filter(Boolean)
  const doDelete = () => deleteCharacter.mutate(confirmTarget.id, { onSuccess: () => setConfirmTarget(null) })

  return (
    <div className="lore-page player-games-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Личный кабинет</p><h1 className="heading-section">Мои персонажи и игры</h1><p className="lore-intro">Ваши герои и столы, где они играют.</p></div><div className="flex flex-wrap gap-2"><Link className="lore-chip" to="/schedule"><LoreIcon name="history" />Расписание</Link><Button onClick={() => navigate('/characters/new')}><LoreIcon name="plus" />Новый персонаж</Button></div></header>

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
          const table = tables.current.get(character.id)
          return <CharacterCard key={character.id} character={character} identity={identityOf(character)} table={table} pastTables={showHistory ? tables.past.get(character.id) ?? [] : []} nextSession={table && nextByCampaign.get(table.id)} onDelete={setConfirmTarget} />
        })}</section>)}

      {confirmTarget && <ConfirmDialog title="Удалить персонажа?" message={`Персонаж «${confirmTarget.name}» (ур. ${confirmTarget.level}) будет удалён безвозвратно вместе со всеми своими данными.`} busy={deleteCharacter.isPending} error={deleteCharacter.error} onCancel={() => { setConfirmTarget(null); deleteCharacter.reset() }} onConfirm={doDelete} />}
    </div>
  )
}
