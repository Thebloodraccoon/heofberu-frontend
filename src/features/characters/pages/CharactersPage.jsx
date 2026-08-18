import { Link, useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  PageHeader,
  Spinner,
} from '@/components/ui'
import { useBackgrounds, useClasses, useRaces } from '@/features/catalog/queries.js'
import { useCharacters } from '@/features/characters/queries.js'

export default function CharactersPage() {
  const navigate = useNavigate()
  const { data: characters, isLoading, error, refetch } = useCharacters()

  const { data: races = [] } = useRaces({ size: 100 })
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: backgrounds = [] } = useBackgrounds({ size: 100 })

  return (
    <div>
      <PageHeader
        title="Персонажи"
        subtitle="Ваши герои и их состояния"
        actions={<Button onClick={() => navigate('/characters/new')}>+ Новый персонаж</Button>}
      />

      {error && <ErrorBox error={error} onRetry={refetch} />}
      {!error && isLoading && <Spinner />}
      {!error && !isLoading && characters?.length === 0 && (
        <EmptyState text="Персонажей пока нет — создайте первого" />
      )}
      {characters?.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => {
            const cls = classes.find((x) => x.id === c.class_id)
            const race = races.find((x) => x.id === c.race_id)
            const bg = backgrounds.find((x) => x.id === c.background_id)
            const subcls = cls?.subclasses?.find((x) => String(x.id) === String(c.subclass_id))
            return (
              <Link
                key={c.id}
                to={`/characters/${c.id}`}
                className="catalog-tile"
              >
                <div className="list-row">
                  <p className="item-name group-hover:text-ember">{c.name}</p>
                  <Badge tone="accent">Ур. {c.level}</Badge>
                </div>
                <p className="text-hint mt-1">
                  {[cls?.name, subcls?.name, race?.name, bg?.name].filter(Boolean).join(' · ') || 'Без класса'}
                </p>
                <p className="mt-3 text-sm">
                  <span className="text-stone-400">HP </span>
                  <span className="font-semibold text-stone-200">
                    {c.current_hp} / {c.max_hp}
                  </span>
                  {c.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{c.temp_hp})</span>}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
