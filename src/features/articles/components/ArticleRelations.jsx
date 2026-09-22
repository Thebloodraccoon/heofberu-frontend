import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { articlesApi, RELATION_TYPES } from '@/features/articles/api.js'
import { useArticleRelations } from '@/features/articles/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, ErrorBox, Input, Select } from '@/components/ui'
import { articleTypeLabels, relationTypeLabels } from '@/lib/i18n'

// Граф связей статьи (всё, что не укладывается в дерево parent_id): исходящие и входящие.
export default function ArticleRelations({ articleId, candidates }) {
  const qc = useQueryClient()
  const relQ = useArticleRelations(articleId)
  const [target, setTarget] = useState('')
  const [type, setType] = useState('SEE_ALSO')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await qc.invalidateQueries({ queryKey: queryKeys.articles.relations(articleId) })
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const add = () =>
    run(async () => {
      await articlesApi.relations.create(articleId, {
        to_article_id: Number(target),
        relation_type: type,
        note: note.trim() || null,
      })
      setTarget('')
      setNote('')
    })

  return (
    <div className="space-y-3">
      <h3 className="heading-sub">Связи</h3>
      {relQ.error && <ErrorBox error={relQ.error} onRetry={relQ.refetch} />}
      <ul className="space-y-1 text-sm">
        {(relQ.data ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-stone-700/60 px-2 py-1">
            <span>
              {r.direction === 'outgoing' ? 'Эта статья ' : ''}
              <span className="text-stone-400">{relationTypeLabels[r.relation_type] ?? r.relation_type}</span>
              {r.direction === 'incoming' ? ' → эту статью: ' : ' '}
              <b className="text-stone-100">{r.article.title}</b>{' '}
              <span className="text-xs text-stone-500">
                ({articleTypeLabels[r.article.article_type] ?? r.article.article_type})
              </span>
              {r.note && <span className="text-stone-500"> — {r.note}</span>}
            </span>
            <Button
              size="xs"
              variant="danger"
              disabled={busy}
              onClick={() => run(() => articlesApi.relations.remove(articleId, r.id))}
            >
              ✕
            </Button>
          </li>
        ))}
        {relQ.data?.length === 0 && <li className="text-stone-500">Связей нет.</li>}
      </ul>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {RELATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {relationTypeLabels[t]}
            </option>
          ))}
        </Select>
        <Select value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Статья…">
          {candidates.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.title}
            </option>
          ))}
        </Select>
        <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Заметка" />
        <Button variant="ghost" disabled={busy || !target} onClick={add}>
          Связать
        </Button>
      </div>
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
    </div>
  )
}
