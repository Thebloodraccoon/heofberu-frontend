import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Button,
  EmptyState,
  ErrorBox,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'
import { charactersApi } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useBackgrounds, useClasses, useRaces } from '@/features/catalog/queries.js'
import { useCharacters } from '@/features/characters/queries.js'

export default function CharactersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: characters, isLoading, error, refetch } = useCharacters()

  const { data: races = [] } = useRaces({ size: 100 })
  const { data: classes = [] } = useClasses({ size: 100 })
  const { data: backgrounds = [] } = useBackgrounds({ size: 100 })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const target = characters?.find((c) => String(c.id) === deleteId)

  const doDelete = async () => {
    try {
      setDeleteBusy(true)
      await charactersApi.remove(deleteId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.all })
      setDeleteBusy(false)
      setDeleteOpen(false)
      setDeleteId('')
      setDeleteError(null)
    } catch (e) {
      setDeleteError(e)
      setDeleteBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Персонажи"
        subtitle="Ваши герои и их состояния"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
              Удалить персонажа
            </Button>
            <Button onClick={() => navigate('/characters/new')}>+ Новый персонаж</Button>
          </div>
        }
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

      {deleteOpen && (
        <Modal title="Удалить персонажа" onClose={() => !deleteBusy && setDeleteOpen(false)} size="md">
          {characters?.length === 0 ? (
            <EmptyState text="Нет персонажей для удаления" />
          ) : (
            <>
              <p className="text-sm text-stone-400">
                Выберите персонажа, которого нужно удалить. Действие необратимо.
              </p>
              <div className="mt-3">
                <Select value={deleteId} onChange={(e) => setDeleteId(e.target.value)}>
                  <option value="">Выберите персонажа...</option>
                  {(characters ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · ур. {c.level}
                    </option>
                  ))}
                </Select>
              </div>
              {target && (
                <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                  Персонаж «{target.name}» (ур. {target.level}) будет удалён безвозвратно вместе со всеми
                  своими данными.
                </p>
              )}
              {deleteError && (
                <div className="mt-3">
                  <ErrorBox error={deleteError} onRetry={() => setDeleteError(null)} />
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2 border-t border-stone-700 pt-3">
                <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
                  Отмена
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!deleteId || deleteBusy}
                  onClick={doDelete}
                >
                  {deleteBusy ? 'Удаляем...' : 'Удалить'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
