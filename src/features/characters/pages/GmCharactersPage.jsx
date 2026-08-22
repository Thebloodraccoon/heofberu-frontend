import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  Modal,
  PageHeader,
  Spinner,
} from '@/components/ui'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { useCharacters } from '@/features/characters/queries.js'
import { useClasses, useRaces } from '@/features/catalog/queries.js'
import { useUsers } from '@/features/users/queries.js'

function CharacterTile({ character, classNameOf, raceNameOf, playerName, onOpenEditor }) {
  const navigate = useNavigate()
  return (
    <div className="catalog-tile">
      <div className="list-row">
        <p className="item-name">{character.name || 'Безымянный'}</p>
        <Badge tone="accent">Ур. {character.level}</Badge>
      </div>
      <p className="text-hint mt-1">
        {[classNameOf(character.class_id), raceNameOf(character.race_id)].filter(Boolean).join(' · ') ||
          'Без класса'}
      </p>
      <p className="mt-1 text-xs text-stone-500">Игрок: {playerName ?? `#${character.owner_id}`}</p>
      <p className="mt-2 text-sm">
        <span className="text-stone-400">HP </span>
        <span className="font-semibold text-stone-200">
          {character.current_hp} / {character.max_hp}
        </span>
        {character.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{character.temp_hp})</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-700/60 pt-3">
        <Button size="sm" onClick={() => onOpenEditor(character)}>
          Панель редакции
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/characters/${character.id}`)}>
          Перейти к персонажу
        </Button>
      </div>
    </div>
  )
}

export default function GmCharactersPage() {
  const { data: characters = [], isLoading, error, refetch } = useCharacters()
  const { data: users = [] } = useUsers()
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: races = [] } = useRaces({ size: 100 })

  const [editorCharacter, setEditorCharacter] = useState(null)
  const [panelError, setPanelError] = useState(null)

  const userById = useMemo(() => new Map(users.map((u) => [Number(u.id), u])), [users])
  const classById = useMemo(() => new Map(classes.map((c) => [Number(c.id), c])), [classes])
  const raceById = useMemo(() => new Map(races.map((r) => [Number(r.id), r])), [races])

  const reload = async () => {
    await refetch()
  }

  if (error && characters.length === 0) return <ErrorBox error={error} onRetry={refetch} />
  if (isLoading && characters.length === 0) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Персонажи игроков"
        subtitle="Панель ГМа: редактирование персонажей и быстрый переход к листу"
      />

      {error && <ErrorBox error={error} onRetry={refetch} />}
      {!error && characters.length === 0 && (
        <EmptyState text="Персонажей пока нет" />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <CharacterTile
            key={c.id}
            character={c}
            classNameOf={(id) => classById.get(Number(id))?.name}
            raceNameOf={(id) => raceById.get(Number(id))?.name}
            playerName={userById.get(Number(c.owner_id))?.username}
            onOpenEditor={setEditorCharacter}
          />
        ))}
      </div>

      {editorCharacter && (
        <Modal
          title={`Редактирование: ${editorCharacter.name || 'Безымянный'}`}
          onClose={() => {
            setEditorCharacter(null)
            setPanelError(null)
          }}
          size="lg"
        >
          {panelError && (
            <div className="mb-3">
              <ErrorBox error={panelError} onRetry={() => setPanelError(null)} />
            </div>
          )}
          <GmCharacterPanel
            character={editorCharacter}
            onError={setPanelError}
            reload={reload}
          />
        </Modal>
      )}
    </div>
  )
}
