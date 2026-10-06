import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '@/features/articles/api.js'
import { useTagsPage } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, ConfirmDialog, ErrorBox, Input, Skeleton } from '@/components/ui'

import LoreIcon from './LoreIcon.jsx'
import Pagination from '@/components/ui/Pagination.jsx'

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
    <div className="tags-manager">
      <p className="lore-intro">Общий словарь для статей и справочника. Переименование изменит тег во всех записях.</p>
      <div className="space-y-5">
        <form role="search" className="ui-search-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied(search.trim()) }}>
          <div className="ui-search-field">
            <LoreIcon name="search" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по тегам…" aria-label="Поиск по тегам" />
            <button type="submit" className="ui-search-submit" aria-label="Найти теги"><LoreIcon name="arrow" /></button>
          </div>
        </form>
        <section className="tags-manager-create">
          <label htmlFor="new-tag-name" className="text-label">Новый тег</label>
          <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); if (!busy) create() }}>
            <Input id="new-tag-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название тега" className="min-w-0 flex-1" />
            <Button type="submit" disabled={busy || !newName.trim()}><LoreIcon name="plus" />Создать</Button>
          </form>
        </section>
        <div className="lore-results-toolbar"><span>Тегов: {q.data?.total ?? 0}</span><span>Общий словарь</span></div>
        {error && !toDelete && <ErrorBox error={error} onRetry={() => setError(null)} />}


        {q.isLoading && <Skeleton className="h-24 w-full" />}
        {q.error && <ErrorBox error={q.error} onRetry={q.refetch} />}

        {!q.isLoading && !q.error && (
          <>
            {tags.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-500">
                {applied ? `Ничего не найдено по «${applied}».` : 'Тегов пока нет — создайте первый.'}
              </p>
            ) : (
              <ul className="tags-manager-list">
                {tags.map((t) =>
                  editing?.id === t.id ? (
                    <li key={t.id} className="tags-manager-row tags-manager-row--editing">
                      <input
                        aria-label="Новое название тега"
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') rename()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="min-w-0 flex-1 bg-transparent text-sm text-stone-100 outline-none placeholder:text-stone-500"
                      />
                      <button
                        type="button"
                        aria-label="Сохранить"
                        title="Сохранить"
                        disabled={busy}
                        onClick={rename}
                        className="rounded-full px-1.5 text-emerald-300 transition hover:bg-emerald-900/40 disabled:opacity-50"
                      >
                        <LoreIcon name="check" />
                      </button>
                      <button
                        type="button"
                        aria-label="Отмена"
                        title="Отмена"
                        onClick={() => setEditing(null)}
                        className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
                      >
                        <LoreIcon name="close" />
                      </button>
                    </li>
                  ) : (
                    <li
                      key={t.id}
                      className="tags-manager-row"
                    >
                      <span className="tags-manager-name">#{t.name}</span>
                      <button
                        type="button"
                        aria-label={`Переименовать тег ${t.name}`}
                        title="Переименовать"
                        onClick={() => setEditing({ id: t.id, name: t.name })}
                        className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
                      >
                        <LoreIcon name="edit" />
                      </button>
                      {isFounder && (
                        <button
                          type="button"
                          aria-label={`Удалить тег ${t.name}`}
                          title="Удалить"
                          onClick={() => setToDelete(t)}
                          className="rounded-full px-1.5 text-stone-400 transition hover:bg-red-950/50 hover:text-red-300"
                        >
                          <LoreIcon name="close" />
                        </button>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}

            <Pagination page={page} total={q.data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
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
