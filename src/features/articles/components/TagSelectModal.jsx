import { useEffect, useState } from 'react'
import { useCreateTag, useTagSearch } from '@/features/articles/queries.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'
import { Button, ErrorBox, Input, Modal, Skeleton } from '@/components/ui'

const chip = (active) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
    active
      ? 'border-ember bg-ember/20 text-stone-100'
      : 'border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800'
  }`

// Выбор тегов в модалке: серверный поиск по всему словарю (тегов много),
// популярные сверху или А–Я, счётчик использований, блок «Выбрано».
// Выбор копится в черновике и применяется кнопкой — «Отмена»/Esc ничего не меняют.
// allowCreate (ГМ): Enter или «Создать тег» добавляет новый тег в словарь и сразу выбирает его.
// match ('any' | 'all') — если задан, в модалке появляется выбор режима фильтра, и он
// возвращается вторым аргументом onApply(tags, match).
export default function TagSelectModal({
  title = 'Теги',
  subtitle,
  selected,
  onApply,
  onClose,
  allowCreate = false,
  applyText = 'Применить',
  match,
}) {
  const [draft, setDraft] = useState(selected)
  const [matchDraft, setMatchDraft] = useState(match ?? 'any')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('popular')
  const debounced = useDebouncedValue(search.trim())
  const tagsQ = useTagSearch({ search: debounced, sort })
  const createTag = useCreateTag()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const items = tagsQ.data?.items ?? []
  const total = tagsQ.data?.total ?? 0
  const term = search.trim()
  const exact = items.find((t) => t.name.toLowerCase() === term.toLowerCase())
  const isSelected = (id) => draft.some((t) => t.id === id)
  const toggle = (tag) =>
    setDraft((d) => (d.some((t) => t.id === tag.id) ? d.filter((t) => t.id !== tag.id) : [...d, { id: tag.id, name: tag.name }]))

  const create = async () => {
    if (!term) return
    const tag = await createTag.mutateAsync(term).catch(() => null)
    if (tag) {
      setDraft((d) => [...d, { id: tag.id, name: tag.name }])
      setSearch('')
    }
  }

  const onSearchKey = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Ждём, пока поиск догонит ввод, иначе «точное совпадение» проверялось бы по старому списку.
    if (!term || debounced !== term || tagsQ.isFetching) return
    if (exact) toggle(exact)
    else if (allowCreate) create()
    else if (items.length === 1) toggle(items[0])
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      size="2xl"
      scroll
      maxH="88vh"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-sm text-stone-400 max-sm:mr-0">Выбрано: {draft.length}</span>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onApply(draft, matchDraft)}>{applyText}</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Input
          autoFocus
          className="input-search min-w-56 flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder={allowCreate ? 'Найти или создать тег…' : 'Найти тег…'}
          aria-label="Поиск тегов"
        />
        <div className="flex rounded border border-stone-700 text-xs" role="group" aria-label="Сортировка">
          {[
            ['popular', 'Популярные'],
            ['name', 'А–Я'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={`px-3 py-1.5 transition ${sort === key ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {draft.length > 0 && (
        <div className="rounded border border-stone-800 bg-stone-950/50 p-2">
          <div className="mb-1.5 flex items-center justify-between text-xs text-stone-500">
            <span>Выбрано</span>
            <button type="button" className="hover:text-stone-300" onClick={() => setDraft([])}>
              Очистить
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.map((t) => (
              <button key={t.id} type="button" className={chip(true)} onClick={() => toggle(t)} title="Убрать">
                #{t.name} <span aria-hidden="true">✕</span>
              </button>
            ))}
          </div>
          {match !== undefined && draft.length > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-400">
              Показывать статьи:
              <div className="flex rounded border border-stone-700" role="group" aria-label="Режим тегов">
                {[
                  ['any', 'с любым из тегов'],
                  ['all', 'со всеми тегами сразу'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={matchDraft === key}
                    onClick={() => setMatchDraft(key)}
                    className={`px-2.5 py-1 transition ${
                      matchDraft === key ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {allowCreate && term && !exact && debounced === term && !tagsQ.isFetching && (
        <button
          type="button"
          disabled={createTag.isPending}
          onClick={create}
          className="w-full rounded border border-dashed border-ember/60 px-3 py-2 text-left text-sm text-ember transition hover:bg-ember/10"
        >
          + Создать тег «{term}»
        </button>
      )}
      {createTag.error && <ErrorBox error={createTag.error} onRetry={() => createTag.reset()} />}

      {tagsQ.isLoading && <Skeleton className="h-24 w-full" />}
      {tagsQ.error && <ErrorBox error={tagsQ.error} onRetry={tagsQ.refetch} />}
      <div className={`flex flex-wrap gap-1.5 transition-opacity ${tagsQ.isFetching ? 'opacity-60' : ''}`}>
        {items.map((t) => (
          <button key={t.id} type="button" aria-pressed={isSelected(t.id)} className={chip(isSelected(t.id))} onClick={() => toggle(t)}>
            #{t.name}
            <span className="text-xs text-stone-500">{t.usage_count}</span>
          </button>
        ))}
      </div>
      {tagsQ.data && items.length === 0 && (
        <p className="text-sm text-stone-500">{term ? 'Таких тегов нет.' : 'Тегов пока нет.'}</p>
      )}
      {total > items.length && (
        <p className="text-xs text-stone-500">
          Показаны {items.length} из {total} — уточните поиск.
        </p>
      )}
    </Modal>
  )
}
