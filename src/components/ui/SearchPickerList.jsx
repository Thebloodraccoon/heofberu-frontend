import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import SearchToolbar from './SearchToolbar.jsx'
import { ErrorBox, Skeleton } from './primitives.jsx'

const SCROLL_THRESHOLD = 120

// Общий список выбора для панелей и модалок: поле поиска + «Найти», кнопка
// «Фильтры» (сами фильтры — у вызывающего: onFilters/filterCount, панель и
// сводку он рисует в header), подгрузка следующей страницы при прокрутке вниз.
// fetchPage({ page, size, search }) → Page { items, total }; queryKey должен
// включать всё, от чего зависит выборка (фильтры, вид…), — поиск дописывается сам.
// Возвращает фрагмент: список (.grant-picker-list) остаётся прямым flex-потомком
// тела панели и прокручивается один.
export default function SearchPickerList({
  queryKey,
  fetchPage,
  pageSize = 30,
  enabled = true,
  placeholder = 'Название или описание…',
  label = 'Поиск записей',
  submitLabel = 'Найти',
  onFilters,
  filterCount = 0,
  filtersOpen = false,
  header = null,
  exclude,
  emptyText = 'Ничего не найдено',
  listClassName = 'grant-picker-list space-y-2 pr-1',
  children,
}) {
  const [queryInput, setQueryInput] = useState('')
  const [search, setSearch] = useState('')
  const listRef = useRef(null)

  const q = useInfiniteQuery({
    queryKey: [...queryKey, search],
    queryFn: ({ pageParam }) => fetchPage({ page: pageParam, size: pageSize, ...(search ? { search } : {}) }),
    initialPageParam: 1,
    // Дальше — пока загружено меньше total и последняя страница не пустая (без total — одна страница).
    getNextPageParam: (last, pages) =>
      pages.reduce((count, page) => count + (page?.items?.length ?? 0), 0) < (last?.total ?? 0) && last?.items?.length
        ? pages.length + 1
        : undefined,
    enabled,
  })

  const all = q.data?.pages.flatMap((page) => page?.items ?? []) ?? []
  const items = exclude ? all.filter((item) => !exclude(item)) : all

  const loadMoreIfNear = () => {
    const el = listRef.current
    if (!el || !q.hasNextPage || q.isFetching || q.isError) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD) q.fetchNextPage()
  }

  // Первая страница не заполнила список (или почти всё скрыто exclude) —
  // прокрутки нет, догружаем сразу. clientHeight 0 — список не на экране. После
  // ошибки не догружаем (иначе запрос на каждый рендер) — повтор только кнопкой.
  useEffect(() => {
    const el = listRef.current
    if (!el || !el.clientHeight || !q.hasNextPage || q.isFetching || q.isError) return
    if (el.scrollHeight - el.clientHeight < SCROLL_THRESHOLD) q.fetchNextPage()
  })

  return (
    <>
      <div className="mb-3">
        <SearchToolbar
          query={queryInput}
          onQueryChange={setQueryInput}
          onSearch={() => setSearch(queryInput.trim())}
          onFilters={onFilters}
          filtersOpen={filtersOpen}
          filterCount={filterCount}
          placeholder={placeholder}
          label={label}
          submitLabel={submitLabel}
        />
      </div>
      {header}
      <div ref={listRef} onScroll={loadMoreIfNear} className={listClassName}>
        {q.isError && <ErrorBox error={q.error} onRetry={() => (q.isFetchNextPageError ? q.fetchNextPage() : q.refetch())} />}
        {q.isSuccess && !q.hasNextPage && !q.isFetching && items.length === 0 && <p className="text-sm text-stone-500">{emptyText}</p>}
        {children(items, { search })}
        {q.isFetching && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
