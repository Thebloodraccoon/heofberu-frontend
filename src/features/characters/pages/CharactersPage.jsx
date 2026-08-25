import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBox, PageHeader, Spinner } from '@/components/ui'
import { useBackgrounds, useClasses, useRaces } from '@/features/catalog/queries.js'
import { useDeleteCharacter, useMyCharacters } from '@/features/characters/queries.js'

export default function CharactersPage() {
  const navigate = useNavigate()
  const { data: characters, isLoading, error, refetch } = useMyCharacters()

  const { data: races = [] } = useRaces({ size: 100 })
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: backgrounds = [] } = useBackgrounds({ size: 100 })

  const [confirmTarget, setConfirmTarget] = useState(null)

  const deleteCharacter = useDeleteCharacter()

  const doDelete = async () => {
    try {
      await deleteCharacter.mutateAsync(confirmTarget.id)
      setConfirmTarget(null)
    } catch {
      // ошибка остаётся в deleteCharacter.error и показывается в диалоге
    }
  }

  return (
    <div>
      <PageHeader
        title="Мои персонажи"
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
              <div key={c.id} className="catalog-tile relative">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(c)}
                  title="Удалить персонажа"
                  aria-label="Удалить персонажа"
                  className="absolute bottom-2.5 right-2 z-10 rounded border border-stone-700 bg-stone-900/80 p-1.5 text-stone-500 transition hover:border-red-800 hover:bg-red-950/50 hover:text-red-300"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M8.75 2a1.25 1.25 0 0 0-1.22 1h4.94A1.25 1.25 0 0 0 11.25 2h-2.5ZM6.24 3.5H4.5a.75.75 0 0 0 0 1.5h.57l.62 9.93A2.25 2.25 0 0 0 7.94 17h4.12a2.25 2.25 0 0 0 2.25-2.07l.62-9.93h.57a.75.75 0 0 0 0-1.5h-1.74a2.75 2.75 0 0 0-2.68-2h-2.16a2.75 2.75 0 0 0-2.68 2Zm1.01 1.5h5.5l-.61 9.84a.75.75 0 0 1-.75.66H7.94a.75.75 0 0 1-.75-.66L6.58 5h.67Z"
                      clipRule="evenodd"
                    />
                    <path d="M8.5 7.25a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Zm3 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Z" />
                  </svg>
                </button>
                <Link to={`/characters/${c.id}`} className="group block">
                  <div className="list-row">
                    <p className="item-name group-hover:text-ember">{c.name}</p>
                    <Badge tone="accent">Ур. {c.level}</Badge>
                  </div>
                  <p className="text-hint mt-1">
                    {[cls?.name, subcls?.name, race?.name, bg?.name].filter(Boolean).join(' · ') || 'Без класса'}
                  </p>
                  <p className="mt-3 pr-9 text-sm">
                    <span className="text-stone-400">HP </span>
                    <span className="font-semibold text-stone-200">
                      {c.current_hp} / {c.max_hp}
                    </span>
                    {c.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{c.temp_hp})</span>}
                  </p>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Удалить персонажа?"
          message={
            <>
              Персонаж{' '}
              <span className="font-semibold text-stone-100">
                «{confirmTarget.name}» (ур. {confirmTarget.level})
              </span>{' '}
              будет удалён безвозвратно вместе со всеми своими данными.
            </>
          }
          busy={deleteCharacter.isPending}
          error={deleteCharacter.error}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  )
}
