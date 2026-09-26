import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '@/features/articles/api.js'
import { useTagsPage } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Card, ConfirmDialog, ErrorBox, Input, Skeleton } from '@/components/ui'

const PAGE_SIZE = 100

// Словарь тегов: общий для рас, подрас, предысторий и статей. Переименование
// глобально; удалять можно только неиспользуемые теги и только основателю.
export default function TagsManager() {
  const { isFounder } = useAuth()
  const toasts = useToasts()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const q = useTagsPage({ page, size: PAGE_SIZE, ...(applied ? { search: applied } : {}) })
  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE))
  const tags = q.data?.items ?? []

  const run = async (fn, okTitle) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await qc.invalidateQueries({ queryKey: queryKeys.tags.all })
      // Имя тега встроено в ответы статей — их кэш тоже устарел.
      await qc.invalidateQueries({ queryKey: queryKeys.articles.all })
      if (okTitle) toasts.push(okTitle, undefined, 'success')
      return true
    } catch (e) {
      setError(e)
      return false
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    const name = newName.trim()
    if (name && (await run(() => tagsApi.create(name), 'Тег создан'))) setNewName('')
  }

  const rename = async () => {
    const name = editing.name.trim()
    if (name && (await run(() => tagsApi.rename(editing.id, name), 'Тег переименован'))) setEditing(null)
  }

  const remove = async () => {
    if (await run(() => tagsApi.remove(toDelete.id), 'Тег удалён')) setToDelete(null)
  }

  return (
    <div className="w-full">
      <p className="mb-4 text-sm text-stone-400">Общий словарь тегов: расы, подрасы, предыстории, статьи.</p>
      <Card className="space-y-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Новый тег…"
              className="flex-1"
            />
            <Button disabled={busy || !newName.trim()} onClick={create}>
              Создать
            </Button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              setPage(1)
              setApplied(search.trim())
            }}
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по тегам…"
              className="sm:w-56"
            />
            <Button variant="ghost" type="submit">
              Найти
            </Button>
          </form>
        </div>

        {error && !toDelete && <ErrorBox error={error} onRetry={() => setError(null)} />}

        <div className="border-t border-stone-700/60" />

        {q.isLoading && <Skeleton className="h-24 w-full" />}
        {q.error && <ErrorBox error={q.error} onRetry={q.refetch} />}

        {!q.isLoading && !q.error && (
          <>
            {tags.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                {applied ? `Ничего не найдено по «${applied}».` : 'Тегов пока нет — создайте первый.'}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {tags.map((t) =>
                  editing?.id === t.id ? (
                    <li key={t.id} className="flex items-center gap-1.5 rounded-full border border-ember bg-stone-800/80 py-1 pl-3 pr-1.5">
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') rename()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="w-28 bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-500"
                      />
                      <button
                        type="button"
                        aria-label="Сохранить"
                        title="Сохранить"
                        disabled={busy}
                        onClick={rename}
                        className="rounded-full px-1.5 text-emerald-300 transition hover:bg-emerald-900/40 disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        aria-label="Отмена"
                        title="Отмена"
                        onClick={() => setEditing(null)}
                        className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
                      >
                        ✕
                      </button>
                    </li>
                  ) : (
                    <li
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-600 bg-stone-800/60 py-1 pl-3 pr-1 text-sm text-stone-100 transition hover:border-stone-500"
                    >
                      #{t.name}
                      <button
                        type="button"
                        aria-label={`Переименовать тег ${t.name}`}
                        title="Переименовать"
                        onClick={() => setEditing({ id: t.id, name: t.name })}
                        className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
                      >
                        ✎
                      </button>
                      {isFounder && (
                        <button
                          type="button"
                          aria-label={`Удалить тег ${t.name}`}
                          title="Удалить"
                          onClick={() => setToDelete(t)}
                          className="rounded-full px-1.5 text-stone-400 transition hover:bg-red-950/50 hover:text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-stone-700/60 pt-3 text-xs text-stone-400">
                <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Назад
                </Button>
                <span>
                  Страница {page} из {totalPages} · {q.data?.total ?? 0} тегов
                </span>
                <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Вперёд →
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
      {toDelete && (
        <ConfirmDialog
          title="Удалить тег?"
          message={`«${toDelete.name}» будет удалён. Если тег ещё где-то используется, сервер откажет — сначала снимите его.`}
          busy={busy}
          error={error}
          onCancel={() => {
            setToDelete(null)
            setError(null)
          }}
          onConfirm={remove}
        />
      )}
    </div>
  )
}
