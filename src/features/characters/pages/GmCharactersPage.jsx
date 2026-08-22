import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  EmptyState,
  ErrorBox,
  Input,
  PageHeader,
  Spinner,
} from '@/components/ui'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { useCharacters } from '@/features/characters/queries.js'
import { useClasses } from '@/features/catalog/queries.js'
import { useUsers } from '@/features/users/queries.js'

function CharacterListItem({ character, subtitle, selected, onEdit }) {
  return (
    <div
      className={`fantasy-panel card-hover cursor-pointer rounded-lg p-3 transition ${
        selected ? 'border-ember/80 bg-stone-900' : 'hover:border-ember/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onEdit(character)} className="min-w-0 flex-1 text-left">
          <p className={`font-display text-sm font-bold ${selected ? 'text-ember' : 'text-stone-100'}`}>
            {character.name || 'Безымянный'}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
        </button>
        <button
          type="button"
          onClick={() => onEdit(character)}
          className="my-[5px] shrink-0 rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
        >
          Изменить
        </button>
      </div>
      <GoToButton characterId={character.id} />
    </div>
  )
}

function GoToButton({ characterId }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/characters/${characterId}`, { state: { from: 'gm' } })
      }}
      className="mt-2 rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
      title="Открыть лист персонажа как игрок"
    >
      Перейти
    </button>
  )
}

export default function GmCharactersPage() {
  const { data: characters = [], isLoading, error, refetch } = useCharacters()
  const { data: users = [] } = useUsers()
  const { data: classes = [] } = useClasses({ size: 100 })

  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [panelError, setPanelError] = useState(null)

  const userById = useMemo(() => new Map(users.map((u) => [Number(u.id), u])), [users])
  const classById = useMemo(() => new Map(classes.map((c) => [Number(c.id), c])), [classes])

  const playerNameOf = (ownerId) => userById.get(Number(ownerId))?.username ?? `#${ownerId}`

  // Поиск по имени персонажа и по имени игрока одновременно.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return characters
    return characters.filter((c) => {
      const player = userById.get(Number(c.owner_id))?.username ?? ''
      return (
        String(c.name ?? '').toLowerCase().includes(q) ||
        player.toLowerCase().includes(q)
      )
    })
  }, [characters, query, userById])

  const reload = async () => {
    await refetch()
  }

  const openEditor = (character) => {
    setSelectedId(character.id)
    setPanelError(null)
  }

  const selectedCharacter = characters.find((c) => c.id === selectedId) ?? null

  if (error && characters.length === 0) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading && characters.length === 0) return <Spinner label="Загружаем персонажей..." />

  return (
    <div>
      <PageHeader
        title="Персонажи игроков"
        subtitle="Панель ГМа: редактирование персонажей и быстрый переход к листу игрока"
      />

      {error && <ErrorBox error={error} onRetry={refetch} />}

      {!error && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto pr-1 lg:sticky lg:top-24">
            <Input
              type="search"
              placeholder="Поиск по персонажу или игроку..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {filtered.length === 0 ? (
              <p className="px-1 text-sm text-stone-500">
                {characters.length === 0 ? 'Персонажей пока нет' : 'Ничего не найдено по запросу'}
              </p>
            ) : (
              filtered.map((c) => (
                <CharacterListItem
                  key={c.id}
                  character={c}
                  subtitle={[playerNameOf(c.owner_id), classById.get(Number(c.class_id))?.name].filter(Boolean).join(' · ')}
                  selected={selectedId === c.id}
                  onEdit={openEditor}
                />
              ))
            )}
          </aside>

          <section className="min-w-0">
            {selectedCharacter ? (
              <Card className="detail-padded">
                <div className="mb-4">
                  <h2 className="font-display text-xl font-bold text-stone-100">
                    Редактируем персонажа «{selectedCharacter.name || 'Безымянный'}»
                  </h2>
                  <p className="mt-1 text-sm text-stone-400">
                    Игрок {playerNameOf(selectedCharacter.owner_id)} · уровень {selectedCharacter.level} · хиты{' '}
                    {selectedCharacter.current_hp}/{selectedCharacter.max_hp}
                  </p>
                  <div className="ornate-rule mt-3">
                    <span aria-hidden className="text-xs">
                      ✦
                    </span>
                  </div>
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
            ) : (
              <EmptyState text="Выберите персонажа в списке слева — здесь откроется панель редакции" />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
