import { useMemo, useState } from 'react'
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { articlePath, isPublicArticle, parseArticleParam } from '@/features/articles/api.js'
import {
  useArticleAncestors,
  useArticleChildren,
  useArticleDetail,
  useArticleRelations,
} from '@/features/articles/queries.js'
import { relationLabel, THIS_ARTICLE_CASE } from '@/features/articles/relationText.js'
import { splitGmBlocks, stripGmBlocks } from '@/features/articles/secrets.js'
import { Badge, ErrorBox, Modal, RichText, Skeleton } from '@/components/ui'
import { articleStatusLabels, articleTypeLabels } from '@/lib/i18n'
import { renderRichHtml } from '@/lib/utils/richText.js'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

// Используем тот же безопасный рендер, что и RichText; якоря добавляем после очистки HTML.
// Оглавление строится только по разделам, видимым в текущем режиме.
function ArticleBody({ body, showSecrets }) {
  const { segments, headings } = useMemo(() => {
    const headings = []
    const segments = splitGmBlocks(showSecrets ? body : stripGmBlocks(body)).map((segment) => {
      const fragment = document.createElement('template')
      fragment.innerHTML = renderRichHtml(segment.text)
      fragment.content.querySelectorAll('h2, h3').forEach((heading) => {
        heading.id = `article-section-${headings.length + 1}`
        headings.push({ id: heading.id, title: heading.textContent, nested: heading.tagName === 'H3' })
      })
      return { ...segment, html: fragment.innerHTML }
    })
    return { segments, headings }
  }, [body, showSecrets])
  if (segments.length === 0) {
    return <RichText value="" className="mt-6" empty="Текст статьи пока не написан." />
  }
  return (
    <div className="lore-body-layout">
      {headings.length > 0 && <aside className="lore-toc">
        <details open>
          <summary>В этой статье</summary>
          <nav aria-label="Оглавление статьи">
            {headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={heading.nested ? 'lore-toc-nested' : ''}>{heading.title}</a>)}
          </nav>
        </details>
      </aside>}
      <div className="mt-6 space-y-4">
      {segments.map((seg, i) =>
        seg.secret ? (
          <aside key={i} className="lore-secret">
            <p className="lore-secret-label"><LoreIcon name="eye" /> Только для мастера</p>
            {seg.html ? <div className="rich-text" dangerouslySetInnerHTML={{ __html: seg.html }} /> : <p className="text-stone-500">Пустой секрет.</p>}
          </aside>
        ) : (
          <div key={i} className="rich-text" dangerouslySetInnerHTML={{ __html: seg.html }} />
        ),
      )}
      </div>
    </div>
  )
}

// Подпись карточки связи — чем связанная статья приходится этой. outgoing: «Эта статья
// находится в» → карточка; incoming: карточка «находится в» → «этой статье» (падеж
// зависит от типа связи — THIS_ARTICLE_CASE, а не всегда «эту статью», см. relationText.js).
function relationCaption(r) {
  const label = relationLabel(r.relation_type)
  if (r.direction === 'outgoing') return `Эта статья ${label}`
  const capitalized = `${label[0].toUpperCase()}${label.slice(1)}`
  return `${capitalized} ${THIS_ARTICLE_CASE[r.relation_type] ?? 'эту статью'}`
}

function RelatedCard({ article, caption, note, secret = false, gmView = false }) {
  return (
    <Link
      to={articlePath(article)}
      className={`group flex flex-col gap-1.5 rounded-lg border bg-stone-900/60 p-4 transition hover:border-ember/60 hover:bg-stone-900 ${
        secret ? 'border-violet-800/70' : 'border-stone-800'
      }`}
    >
      <span className="text-xs uppercase tracking-wide text-stone-500">{caption}</span>
      <span className="font-medium text-stone-100 group-hover:text-ember">{article.title}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        {secret ? (
          <span className="inline-block" title="Секретная связь — игроки её не видят">
            <GmOnlyBadge />
          </span>
        ) : gmView && article.visibility === 'gm_only' && <GmOnlyBadge />}
        <Badge>{articleTypeLabels[article.article_type] ?? article.article_type}</Badge>
        {article.subtype && <span>{article.subtype}</span>}
      </span>
      {note && <span className="text-sm text-stone-400">{note}</span>}
    </Link>
  )
}

export default function ArticleDetailPage() {
  const { gmView, playerView } = useOutletContext()
  const { idSlug } = useParams()
  const location = useLocation()
  const id = parseArticleParam(idSlug)
  const articleQ = useArticleDetail(id)
  const relQ = useArticleRelations(id, playerView)
  const ancestorsQ = useArticleAncestors(id, playerView)
  const childrenQ = useArticleChildren(id, playerView)
  const [lightbox, setLightbox] = useState(null)

  if (articleQ.isLoading) {
    return (
      <div className="mx-auto mt-6 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (articleQ.error) {
    return (
      <div className="mx-auto mt-6 max-w-3xl">
        <ErrorBox error={articleQ.error} onRetry={articleQ.refetch} />
      </div>
    )
  }

  const article = articleQ.data

  if (playerView && !isPublicArticle(article)) {
    return (
      <div className="mx-auto mt-6 max-w-3xl space-y-3">
        <Link
          to={{ pathname: '/lore', search: location.search }}
          className="text-sm text-stone-400 hover:text-stone-200"
        >
          ← Ко всем статьям
        </Link>
        <p className="rounded border border-violet-800/60 bg-violet-950/40 px-4 py-3 text-sm text-violet-200">
          Игроки эту статью не видят: «{article.title}» —{' '}
          {article.status !== 'published' ? articleStatusLabels[article.status] : 'только для ГМ'}.
        </p>
      </div>
    )
  }

  const body = article.body_markdown ?? ''
  const relations = relQ.data ?? []

  // Дочерние статьи и связи показываем вместе. В предпросмотре сервер возвращает
  // только доступные игроку краткие карточки (без полей статуса и видимости).
  const related = [
    ...(childrenQ.data ?? []).map((c) => ({ key: `child-${c.id}`, article: c, caption: 'Входит в эту статью' })),
    ...relations.map((r) => ({
      key: `rel-${r.id}`,
      article: r.article,
      caption: relationCaption(r),
      note: r.note,
      secret: gmView && r.visibility === 'gm_only',
    })),
  ]

  // Картинки живут только в тексте (![подпись](url)). Клик по любой из них открывает её
  // крупно (делегирование — текст это HTML); alt показываем как подпись.
  const openInlineImage = (e) => {
    if (e.target.tagName !== 'IMG') return
    setLightbox({
      src: e.target.getAttribute('src'),
      caption: e.target.getAttribute('alt'),
    })
  }

  return (
    <article className="mt-4 w-full">
      {/* Шапка и текст — колонкой для чтения (~70 символов в строке, как в GitHub/Notion);
          карточки ниже — на всю ширину контейнера. */}
      <div className="mx-auto max-w-3xl">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-stone-400" aria-label="Хлебные крошки">
          <Link to={{ pathname: '/lore', search: location.search }} className="hover:text-stone-200">
            Лор
          </Link>
          {(ancestorsQ.data ?? []).map((a) => (
            <span key={a.id} className="flex items-center gap-1">
              <span aria-hidden="true">›</span>
              <Link to={articlePath(a)} className="hover:text-stone-200">
                {a.title}
              </Link>
            </span>
          ))}
        </nav>

        <h1 className="heading-section mt-2 text-left">{article.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {gmView && article.visibility === 'gm_only' && <GmOnlyBadge />}
          <Badge>{articleTypeLabels[article.article_type] ?? article.article_type}</Badge>
          {article.subtype && <span className="text-sm text-stone-400">{article.subtype}</span>}
          {gmView && article.status !== 'published' && (
            <Badge>{articleStatusLabels[article.status] ?? article.status}</Badge>
          )}
        </div>

        {(article.tags ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(article.tags ?? []).map((t) => (
              <Link
                key={t.id}
                to={`/lore?tags=${t.id}`}
                className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:border-ember hover:text-ember"
              >
                #{t.name}
              </Link>
            ))}
          </div>
        )}

        {article.excerpt && <p className="subtitle mt-2 text-left">{article.excerpt}</p>}

        <div onClick={openInlineImage} className="[&_img]:cursor-zoom-in">
          <ArticleBody body={body} showSecrets={gmView} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-10 space-y-3 border-t border-stone-800 pt-6">
          <h3 className="heading-sub">Смотрите также</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map(({ key, ...card }) => (
              <RelatedCard key={key} {...card} gmView={gmView} />
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <Modal size="4xl" onClose={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.caption ?? ''} className="max-h-[75vh] w-full rounded object-contain" />
          {lightbox.caption && <p className="mt-2 text-center text-sm text-stone-400">{lightbox.caption}</p>}
        </Modal>
      )}
    </article>
  )
}
