import { useRef, useState } from 'react'
import { useToasts } from '@/components/ToastProvider.jsx'
import { CAMPAIGN_ARTICLE_TYPES } from '@/features/articles/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useReplacePublicCampaignArticles } from '@/features/campaigns/queries.js'

const fromLinks = (articles) => (articles ?? []).map(({ article_id, slug, title, article_type, note }) => ({ article_id, slug, title, article_type, note: note ?? '' }))
const toEntries = (links) => links.map((link, position) => ({ article_id: link.article_id, position, note: link.note.trim() || null }))
const toLink = (article) => ({ article_id: article.id, slug: article.slug, title: article.title, article_type: article.article_type, note: '' })

// Квест или сессия кампании — материал базы знаний: читается и правится здесь, а не в лоре.
export const isCampaignMaterial = (articleType) => CAMPAIGN_ARTICLE_TYPES.includes(articleType)

// Подвязанные статьи в режиме правки: каждое изменение сохраняется сразу (PUT всего списка), запросы — по очереди.
// articles — ответ GET /public-campaigns/{id}/articles.
export function useKnowledgeLinks(preset, articles) {
  const { push } = useToasts()
  const [links, setLinks] = useState(() => fromLinks(articles))
  const replace = useReplacePublicCampaignArticles()
  const queue = useRef(Promise.resolve())
  const saved = useRef(JSON.stringify(toEntries(fromLinks(articles))))
  const commit = (next) => {
    setLinks(next)
    const entries = JSON.stringify(toEntries(next))
    if (entries === saved.current) return Promise.resolve()
    const run = queue.current.then(() => replace.mutateAsync({ id: preset.id, articles: toEntries(next) })).then(() => { saved.current = entries })
    queue.current = run.catch((e) => push('База знаний не сохранена', toCampaignError(e).message, 'error'))
    return run
  }
  return {
    links,
    saving: replace.isPending,
    commit,
    move: (index, step) => { const next = [...links]; const [item] = next.splice(index, 1); next.splice(index + step, 0, item); commit(next) },
    saveNote: (id, note) => commit(links.map((item) => (item.article_id === id ? { ...item, note } : item))),
    attach: (article) => commit([...links, toLink(article)]),
    remove: (id) => commit(links.filter((item) => item.article_id !== id)),
    // Название статьи живёт в ней самой: после переименования только обновляем оглавление.
    retitle: (id, title) => setLinks((current) => current.map((item) => (item.article_id === id ? { ...item, title } : item))),
  }
}
