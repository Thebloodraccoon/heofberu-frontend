import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '@/features/articles/api.js'
import { useTagsPage } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Card, ConfirmDialog, ErrorBox, Input, Skeleton } from '@/components/ui'

const PAGE_SIZE = 30

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
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-stone-400">Общий словарь тегов: расы, подрасы, предыстории, статьи.</p>
      <Card className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder="Новый тег"
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск" />
          <Button variant="ghost" type="submit">
            Найти
          </Button>
        </form>
        {error && !toDelete && <ErrorBox error={error} onRetry={() => setError(null)} />}
        {q.isLoading && <Skeleton className="h-24 w-full" />}
        {q.error && <ErrorBox error={q.error} onRetry={q.refetch} />}
        <ul className="space-y-1">
          {(q.data?.items ?? []).map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded border border-stone-700/60 px-2 py-1.5">
              {editing?.id === t.id ? (
                <>
                  <Input
                    autoFocus
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && rename()}
                  />
                  <Button size="sm" disabled={busy} onClick={rename}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Отмена
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-stone-200">{t.name}</span>
                  <Button size="xs" variant="ghost" onClick={() => setEditing({ id: t.id, name: t.name })}>
                    Переименовать
                  </Button>
                  {isFounder && (
                    <Button size="xs" variant="danger" onClick={() => setToDelete(t)}>
                      Удалить
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
          {q.data?.items.length === 0 && <li className="text-sm text-stone-500">Тегов нет.</li>}
        </ul>
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-stone-400">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            {page} / {totalPages}
            <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Вперёд
            </Button>
          </div>
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
