import { Link } from 'react-router-dom'
import { articlePath } from '@/features/articles/api.js'
import { Badge } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'

// Строка статьи — общая для результатов поиска лора и «Связанных статей».
// search — текущие фильтры списка: уходят в ссылку на статью, чтобы на её странице
// панель поиска показывала их же, а «Лор» в хлебных крошках вёл обратно к этим результатам.
// caption/note — подпись связи («Участвовал в») и её пояснение; secret — связь только для ГМ.
export default function ArticleRow({
  article,
  gmView = false,
  showSnippet = false,
  search,
  caption,
  note,
  secret = false,
  heading: Heading = 'h2',
}) {
  const excerpt = note ?? article.excerpt
  return (
    <Link to={{ pathname: articlePath(article), search }} className="lore-article-row">
      <div className="lore-article-meta">
        {caption && <span className="text-xs text-stone-400">{caption}</span>}
        <span className="lore-article-type">{articleTypeLabels[article.article_type] ?? article.article_type}</span>
        {gmView && article.status && article.status !== 'published' && (
          <Badge tone="default">{articleStatusLabels[article.status] ?? article.status}</Badge>
        )}
        {secret ? (
          <span className="inline-block" title="Секретная связь — игроки её не видят">
            <GmOnlyBadge />
          </span>
        ) : gmView && article.visibility === 'gm_only' && <GmOnlyBadge />}
        {article.subtype && <span className="text-xs text-stone-500">{article.subtype.name}</span>}
      </div>
      <div className="lore-article-heading"><Heading>{article.title}</Heading><LoreIcon name="arrow" /></div>
      {excerpt && !(showSnippet && article.snippet) && <p className="lore-article-excerpt">{excerpt}</p>}
      {showSnippet && article.snippet && (
        <p
          className="lore-article-excerpt [&_mark]:bg-ember/20 [&_mark]:text-stone-100"
          dangerouslySetInnerHTML={{ __html: article.snippet }}
        />
      )}
    </Link>
  )
}
