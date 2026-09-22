import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ARTICLE_TYPES } from '@/features/articles/api.js'
import { useArticlesPage, useArticlesSearch } from '@/features/articles/queries.js'
import { Badge, Button, ErrorBox, Input, PageHeader, Select, Skeleton } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

const PAGE_SIZE = 12

function ArticleCard({ article }) {
  return (
    <Link
      to={`/lore/${article.id}`}
      className="block rounded-lg border border-stone-800 bg-stone-900/60 p-4 transition hover:border-ember/60 hover:bg-stone-900"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-stone-100">{article.title}</h3>
        <Badge>{articleTypeLabels[article.article_type] ?? article.article_type}</Badge>
      </div>
      {article.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-stone-400">{article.excerpt}</p>}
      {article.snippet && (
        <p
          className="mt-1.5 line-clamp-2 text-sm text-stone-400 [&_mark]:bg-ember/30 [&_mark]:text-stone-100"
          dangerouslySetInnerHTML={{ __html: article.snippet }}
        />
      )}
    </Link>
  )
}

export default function LorePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const articleType = params.get('type') ?? ''
  const [input, setInput] = useState(q)
  const [page, setPage] = useState(1)

  const searching = q.trim().length >= 2
  const searchQ = useArticlesSearch({ q, article_type: articleType || undefined, page, size: PAGE_SIZE })
  const listQ = useArticlesPage(
    { sort: 'newest', article_type: articleType || undefined, page, size: PAGE_SIZE },
    { enabled: !searching },
  )
  const activeQ = searching ? searchQ : listQ

  const totalPages = Math.max(1, Math.ceil((activeQ.data?.total ?? 0) / PAGE_SIZE))

  const submit = (e) => {
    e.preventDefault()
    setPage(1)
    setParams((p) => {
      const next = new URLSearchParams(p)
      if (input.trim()) next.set('q', input.trim())
      else next.delete('q')
      return next
    })
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Лор" subtitle="Своды знаний о мире Хеофберу — расы, регионы, фракции, события." />

      <form className="mt-2 flex flex-wrap gap-2" onSubmit={submit}>
        <Input
          className="input-search min-w-64 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Поиск по статьям…"
        />
        <Select
          value={articleType}
          onChange={(e) => {
            setPage(1)
            setParams((p) => {
              const next = new URLSearchParams(p)
              if (e.target.value) next.set('type', e.target.value)
              else next.delete('type')
              return next
            })
          }}
          placeholder="Все типы"
        >
          <option value="">Все типы</option>
          {ARTICLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {articleTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Button type="submit">Найти</Button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {activeQ.isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {activeQ.error && <ErrorBox error={activeQ.error} onRetry={activeQ.refetch} />}
        {(activeQ.data?.items ?? []).map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
        {activeQ.data && activeQ.data.items.length === 0 && (
          <p className="text-stone-500">
            {searching ? 'По этому запросу ничего не нашлось.' : 'Статей пока нет.'}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-stone-400">
          <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Назад
          </Button>
          {page} / {totalPages}
          <Button size="xs" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </Button>
        </div>
      )}
    </div>
  )
}
