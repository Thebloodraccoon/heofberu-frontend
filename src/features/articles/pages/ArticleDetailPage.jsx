import ArticleAuthor from '@/features/articles/components/ArticleAuthor.jsx'
import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { articlePath, isPublicArticle } from '@/features/articles/api.js'
import {
  useArticleAncestors,
  useArticleChildren,
  useArticleBySlug,
  useArticleRelations,
} from '@/features/articles/queries.js'
import { groupRelations } from '@/features/articles/relationText.js'
import { splitGmBlocks, stripGmBlocks } from '@/features/articles/secrets.js'
import { Badge, ErrorBox, Modal, RichText, Skeleton } from '@/components/ui'
import { articleChildCaption, articleStatusLabels, articleTypeLabels, relatedArticlesLabel } from '@/lib/i18n'
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

// Длинный путь сворачиваем как в Notion: корень, «…» (по клику раскрывается), два последних.
const TRAIL_EDGE = 2

function Breadcrumbs({ ancestors, search }) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = !expanded && ancestors.length > TRAIL_EDGE + 1
  const shown = collapsed ? [ancestors[0], null, ...ancestors.slice(-TRAIL_EDGE)] : ancestors
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-stone-400" aria-label="Хлебные крошки">
      <Link to={{ pathname: '/lore', search }} className="hover:text-stone-200">
        Лор
      </Link>
      {shown.map((a) => (
        <span key={a?.id ?? 'more'} className="flex items-center gap-1">
          <LoreIcon name="chevron" />
          {a ? (
            <Link to={articlePath(a)} className="hover:text-stone-200">
              {a.title}
            </Link>
          ) : (
            <button type="button" onClick={() => setExpanded(true)} className="hover:text-stone-200" title="Показать весь путь">
              …
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

// Короткие факты о статье («Правитель», «Находится в») — строкой под заголовком, как инфобокс.
// ГМ видит бейдж у секретной связи и у закрытой статьи — как на карточках ниже.
function RelationFacts({ sections, gmView }) {
  if (sections.length === 0) return null
  return (
    <dl className="mt-3 space-y-1 text-sm">
      {sections.map((section) => (
        <div key={section.title} className="flex flex-wrap gap-x-2">
          <dt className="text-stone-500">{section.title}:</dt>
          <dd className="flex flex-wrap gap-x-1">
            {section.items.map((r, i) => (
              <span key={r.id}>
                <Link to={articlePath(r.article)} className="inline-flex items-center gap-1 text-stone-200 hover:text-ember">
                  {gmView && (r.visibility === 'gm_only' || r.article.visibility === 'gm_only') && <GmOnlyBadge />}
                  {r.article.title}
                </Link>
                {i < section.items.length - 1 && ','}
              </span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// Подпись карточки — кем связанная статья приходится этой («Упоминается в», «Союзник»…).
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
        {article.subtype && <span className="lore-article-subtype">{article.subtype.name}</span>}
      </span>
      {note && <span className="text-sm text-stone-400">{note}</span>}
    </Link>
  )
}

export default function ArticleDetailPage() {
  const { gmView, playerView } = useOutletContext()
  const { slug } = useParams()
  const location = useLocation()
  const articleQ = useArticleBySlug(slug)
  const id = articleQ.data?.id
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

  // Старая ссылка «id-slug» или slug черновика до переименования — ведём на канонический адрес.
  if (article.slug !== slug) {
    return <Navigate replace to={{ pathname: articlePath(article), search: location.search }} />
  }

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

  // Короткие факты («Правитель», «Находится в») уходят под заголовок, остальное — одной
  // сеткой карточек, где подпись карточки говорит, кем статья приходится этой; порядок —
  // по смыслу (groupRelations). Вложенные статьи дерева — первыми, со своей подписью.
  // В предпросмотре сервер возвращает только доступные игроку краткие карточки (без
  // полей статуса и видимости).
  const relationGroups = groupRelations(relations)
  const cards = [
    ...(childrenQ.data ?? []).map((c) => ({ key: `child-${c.id}`, article: c, caption: articleChildCaption })),
    ...relationGroups
      .filter((group) => !group.fact)
      .flatMap((group) =>
        group.items.map((r) => ({
          key: `rel-${r.id}`,
          article: r.article,
          caption: group.title,
          note: r.note,
          secret: gmView && r.visibility === 'gm_only',
        })),
      ),
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
        <Breadcrumbs ancestors={ancestorsQ.data ?? []} search={location.search} />

        <div className="article-detail-category mt-3 flex flex-wrap items-center gap-2 text-sm">
          <div className="article-detail-category-labels">
          {gmView && article.visibility === 'gm_only' && <GmOnlyBadge />}
          {/* Тип, подтип и теги — ссылки на лор с этим фильтром. */}
          <Link to={`/lore?type=${article.article_type}`} className="lore-article-type hover:opacity-80" title="Все статьи этого типа">
            {articleTypeLabels[article.article_type] ?? article.article_type}
          </Link>
          {article.subtype && (
            <>
            <span className="text-stone-500" aria-hidden="true">·</span>
            <Link
              to={`/lore?type=${article.article_type}&subtype=${article.subtype.id}`}
              className="lore-article-subtype text-sm hover:text-ember"
              title="Все статьи этого подтипа"
            >
              {article.subtype.name}
            </Link>
            </>
          )}
          </div>
          {gmView && article.status !== 'published' && (
            <span className="article-detail-status"><Badge tone={article.status === 'in_review' ? 'accent' : 'default'}>{articleStatusLabels[article.status] ?? article.status}</Badge></span>
          )}
        </div>

        <h1 className="heading-section mt-2 text-left">{article.title}</h1>
        <ArticleAuthor author={article.author} />

        {(article.tags ?? []).length > 0 && (
          <div className="article-detail-tags mt-3 flex flex-wrap items-center gap-2" aria-label="Теги статьи">
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

        <RelationFacts sections={relationGroups.filter((group) => group.fact)} gmView={gmView} />

        {article.excerpt && <p className="subtitle mt-2 text-left">{article.excerpt}</p>}

        <div onClick={openInlineImage} className="[&_img]:cursor-zoom-in">
          <ArticleBody body={body} showSecrets={gmView} />
        </div>
      </div>

      {cards.length > 0 && (
        <section className="mt-10 space-y-3 border-t border-stone-800 pt-6">
          <h3 className="heading-sub">{relatedArticlesLabel}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ key, ...card }) => (
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
