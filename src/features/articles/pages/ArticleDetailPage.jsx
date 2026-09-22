import { Link, useParams } from 'react-router-dom'
import { useArticleDetail, useArticleRelations } from '@/features/articles/queries.js'
import { Badge, Chip, ErrorBox, RichText, Skeleton } from '@/components/ui'
import { articleTypeLabels, relationTypeLabels } from '@/lib/i18n'

export default function ArticleDetailPage() {
  const { id } = useParams()
  const articleQ = useArticleDetail(id)
  const relQ = useArticleRelations(id)

  if (articleQ.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (articleQ.error) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorBox error={articleQ.error} onRetry={articleQ.refetch} />
      </div>
    )
  }

  const article = articleQ.data

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/lore" className="text-sm text-stone-400 hover:text-stone-200">
        ← Ко всем статьям
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge>{articleTypeLabels[article.article_type] ?? article.article_type}</Badge>
        {(article.tags ?? []).map((t) => (
          <Chip key={t.id}>{t.name}</Chip>
        ))}
      </div>

      <h1 className="heading-section mt-2 text-left">{article.title}</h1>
      {article.excerpt && <p className="subtitle mt-1 text-left">{article.excerpt}</p>}

      {article.images?.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {article.images.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-lg border border-stone-800">
              <img src={img.image_url} alt={img.caption ?? ''} className="h-48 w-full object-cover" />
              {img.caption && <figcaption className="p-2 text-xs text-stone-400">{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      <RichText value={article.body_markdown} className="mt-6" empty="Текст статьи пока не написан." />

      {relQ.data?.length > 0 && (
        <div className="mt-8 space-y-2 border-t border-stone-800 pt-5">
          <h3 className="heading-sub">Связи</h3>
          <ul className="space-y-1 text-sm">
            {relQ.data.map((r) => (
              <li key={r.id} className="text-stone-400">
                {r.direction === 'outgoing' ? 'Эта статья ' : ''}
                <span>{relationTypeLabels[r.relation_type] ?? r.relation_type}</span>
                {r.direction === 'incoming' ? ' → эту статью: ' : ' '}
                <Link to={`/lore/${r.article.id}`} className="font-medium text-stone-200 hover:text-ember">
                  {r.article.title}
                </Link>
                {r.note && <span className="text-stone-500"> — {r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
