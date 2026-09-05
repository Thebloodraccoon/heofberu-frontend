// Design-sync reference composition — NOT the real app page verbatim (that's
// src/features/characters/pages/GmCharactersPage.jsx, whose selection state
// is internal `useState(null)` with no controlling prop). This file
// reproduces that page's shell (including its local CharacterListItem,
// copied verbatim) with an `initialSelectedId` prop so the GM edit panel can
// be previewed open, using the REAL GmCharacterPanel.jsx (6 sections — level,
// HP, skills/expertise, feats, features, stats, items) backed by a seeded
// React Query cache instead of a live backend.
import { useMemo, useState } from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Card, EmptyState, ErrorBox, Input, PageHeader } from '@/components/ui'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'

const USERS = [
  { id: 1, username: 'thordak_gm', email: 'thordak@heofberu.local', role: 'found_father' },
  { id: 2, username: 'wanderer42', email: 'wanderer42@example.com', role: 'player' },
  { id: 3, username: 'moonshadow', email: 'moonshadow@example.com', role: 'player' },
]
const CLASSES = [{ id: 1, name: 'Воин' }, { id: 2, name: 'Волшебник' }, { id: 3, name: 'Плут' }]
const CHARACTERS = [
  { id: 1, name: 'Тордек Крепкорукий', level: 5, class_id: 1, owner_id: 2, current_hp: 32, max_hp: 47, temp_hp: 5, hit_dice: 'D10', skill_proficiencies: [{ skill_id: 1, is_expertise: false }, { skill_id: 13, is_expertise: true }] },
  { id: 2, name: 'Элара Светлолистая', level: 3, class_id: 2, owner_id: 3, current_hp: 18, max_hp: 18, temp_hp: 0, hit_dice: 'D6', skill_proficiencies: [{ skill_id: 5, is_expertise: false }] },
  { id: 3, name: 'Мила Скороход', level: 7, class_id: 3, owner_id: 2, current_hp: 40, max_hp: 52, temp_hp: 0, hit_dice: 'D8', skill_proficiencies: [] },
]
const SKILLS_CATALOG = [
  { id: 1, name: 'Атлетика', ability: 'STR' }, { id: 5, name: 'Магия', ability: 'INT' },
  { id: 13, name: 'Восприятие', ability: 'WIS' }, { id: 16, name: 'Запугивание', ability: 'CHA' },
]
const STATS_DATA = {
  strength: { base: 16, total: 18, contributions: [{ source: 'RACE', amount: 2 }] },
  dexterity: { base: 12, total: 12, contributions: [] },
  constitution: { base: 14, total: 16, contributions: [{ source: 'RACE', amount: 2 }] },
  intelligence: { base: 14, total: 14, contributions: [] },
  wisdom: { base: 12, total: 12, contributions: [] },
  charisma: { base: 8, total: 8, contributions: [] },
}
const ASI_ADJUSTMENTS = [{ id: 1, increases: [{ ability: 'strength', amount: 1 }] }]
const ASI_CHOICES = [{ class_level: 4, increases: [{ ability: 'STR', amount: 2 }] }]
const FEATS_CATALOG = [{ id: 10, name: 'Тяжеловес' }]
const CHAR_FEATS = [
  { id: 1, feat_id: 10, feat: { name: 'Тяжеловес', description: 'Один раз в свой ход, промахнувшись рукопашной атакой, вы можете перебросить кубик атаки.', ability_score_increases: [] } },
]
const CHAR_FEATURES = [
  { id: 1, feature_id: 100, feature: { name: 'Благословение старейшины клана', description: 'Раз в день можно перебросить один провальный спасбросок.', source_type: 'OTHER', ability_increases: [] }, notes: 'Выдано за спасение деревни' },
]
const CHAR_ITEMS = [
  { id: 1, item_id: 1, quantity: 1, is_equipped: true, is_attuned: false, notes: '', item: { name: 'Кольчуга', description: 'Тяжёлый доспех.' } },
  { id: 2, item_id: 2, quantity: 3, is_equipped: false, is_attuned: false, notes: '', item: { name: 'Зелье лечения', description: 'Восстанавливает 2к4+2 хитов.' } },
]
const ITEMS_CATALOG_PAGE = {
  items: [
    { id: 1, name: 'Кольчуга', item_type: 'ARMOR', rarity: 'NONE' },
    { id: 3, name: 'Плащ защиты', item_type: 'WONDROUS_ITEM', rarity: 'UNCOMMON' },
    { id: 4, name: 'Длинный меч +1', item_type: 'WEAPON', rarity: 'UNCOMMON' },
  ],
  total: 3,
}

function seedQueryClient(qc) {
  qc.setQueryData(queryKeys.catalog.skills({ size: 100 }), SKILLS_CATALOG)
  qc.setQueryData(queryKeys.catalog.features({ size: 100, source_type: 'OTHER' }), [])
  qc.setQueryData(queryKeys.catalog.feats({ size: 100 }), FEATS_CATALOG)
  qc.setQueryData(['catalog', 'items', 'page', { page: 1, size: 50 }], ITEMS_CATALOG_PAGE)
  for (const char of CHARACTERS) {
    const id = char.id
    qc.setQueryData(['characters', Number(id), 'gm-panel', 'max-level'], { max_level: 20, current_level: char.level, can_level_up: true })
    qc.setQueryData(queryKeys.characters.stats(id), STATS_DATA)
    qc.setQueryData(['characters', Number(id), 'gm-panel', 'asi'], ASI_ADJUSTMENTS)
    qc.setQueryData(queryKeys.characters.feats(id), CHAR_FEATS)
    qc.setQueryData(queryKeys.characters.features(id), CHAR_FEATURES)
    qc.setQueryData(queryKeys.characters.items(id), CHAR_ITEMS)
    qc.setQueryData(queryKeys.characters.asiChoices(id), ASI_CHOICES)
  }
}

// Copied from the real GmCharactersPage.jsx (not exported there) — purely presentational.
function CharacterListItem({ character, playerName, className: classNameName, selected, onEdit }) {
  const navigate = useNavigate()
  const hpPct = character.max_hp > 0 ? Math.min(100, Math.round((character.current_hp / character.max_hp) * 100)) : 0
  return (
    <div className={`fantasy-panel card-hover rounded-lg p-3 transition ${selected ? 'border-ember/80 bg-stone-900' : 'hover:border-ember/50'}`}>
      <button type="button" onClick={() => onEdit(character)} className="flex w-full items-center gap-3 text-left">
        <span className="sheet-avatar shrink-0">{(character.name || '?').slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate font-display text-sm font-bold ${selected ? 'text-ember' : 'text-stone-100'}`}>{character.name || 'Безымянный'}</span>
            <span className="shrink-0 rounded border border-gold/50 px-1.5 py-0.5 font-display text-[10px] font-bold text-gold-light">ур. {character.level}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">{[playerName, classNameName].filter(Boolean).join(' · ')}</span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800">
              <span className={`block h-full rounded-full ${hpPct > 50 ? 'bg-emerald-600' : hpPct > 25 ? 'bg-ember' : 'bg-red-700'}`} style={{ width: `${Math.max(hpPct, 4)}%` }} />
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-stone-400">{character.current_hp}/{character.max_hp}</span>
          </span>
        </span>
      </button>
      <div className="mt-2.5 flex gap-2 border-t border-stone-800 pt-2.5">
        <button type="button" onClick={() => onEdit(character)} className="flex-1 rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800">Изменить</button>
        <button type="button" onClick={() => navigate(`/characters/${character.id}`)} className="flex-1 rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800">Перейти →</button>
      </div>
    </div>
  )
}

function Page({ initialSelectedId }) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [query, setQuery] = useState('')
  const [panelError, setPanelError] = useState(null)
  const userById = useMemo(() => new Map(USERS.map((u) => [Number(u.id), u])), [])
  const classById = useMemo(() => new Map(CLASSES.map((c) => [Number(c.id), c])), [])
  const playerNameOf = (ownerId) => userById.get(Number(ownerId))?.username ?? `#${ownerId}`
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CHARACTERS
    return CHARACTERS.filter((c) => String(c.name ?? '').toLowerCase().includes(q) || playerNameOf(c.owner_id).toLowerCase().includes(q))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])
  const selectedCharacter = CHARACTERS.find((c) => c.id === selectedId) ?? null

  return (
    <div>
      <PageHeader title="Персонажи игроков" subtitle="Панель ГМа: редактирование персонажей и быстрый переход к листу игрока" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto pr-1 lg:sticky lg:top-24">
          <Input type="search" placeholder="Поиск по персонажу или игроку..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {filtered.map((c) => (
            <CharacterListItem key={c.id} character={c} playerName={playerNameOf(c.owner_id)} className={classById.get(Number(c.class_id))?.name} selected={selectedId === c.id} onEdit={(ch) => { setSelectedId(ch.id); setPanelError(null) }} />
          ))}
        </aside>
        <section className="min-w-0">
          {selectedCharacter ? (
            <Card className="detail-padded">
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold text-stone-100">Редактируем персонажа «{selectedCharacter.name}»</h2>
                <p className="mt-1 text-sm text-stone-400">Игрок {playerNameOf(selectedCharacter.owner_id)} · уровень {selectedCharacter.level} · хиты {selectedCharacter.current_hp}/{selectedCharacter.max_hp}</p>
              </div>
              {panelError && <div className="mb-3"><ErrorBox error={panelError} onRetry={() => setPanelError(null)} /></div>}
              <GmCharacterPanel key={selectedCharacter.id} character={selectedCharacter} onError={setPanelError} reload={async () => {}} />
            </Card>
          ) : (
            <EmptyState text="Выберите персонажа в списке слева — здесь откроется панель редакции" />
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * GM's character-roster page: search/select on the left, full GM edit panel
 * (level, HP, skills, feats, features, stats, items) on the right. Pass
 * `initialSelectedId={null}` for the empty-selection state.
 */
export function GmCharactersPage({ initialSelectedId = 1 }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc)
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Page initialSelectedId={initialSelectedId} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
