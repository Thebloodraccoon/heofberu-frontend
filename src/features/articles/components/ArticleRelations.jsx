import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { articlesApi } from '@/features/articles/api.js'
import RelationModal from '@/features/articles/components/RelationModal.jsx'
import { useArticleRelations } from '@/features/articles/queries.js'
import { relationParts } from '@/features/articles/relationText.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, ConfirmDialog, ErrorBox } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

// Граф связей статьи (всё, что не укладывается в дерево parent_id): входящие и исходящие.
// Добавление и правка — в модалке RelationModal, удаление — с подтверждением.
export default function ArticleRelations({ articleId, articleTitle }) {
  const qc = useQueryClient()
  const relQ = useArticleRelations(articleId)
  const [modal, setModal] = useState(null) // null | 'new' | relation
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await articlesApi.relations.remove(articleId, toDelete.id)
      await qc.invalidateQueries({ queryKey: queryKeys.articles.relations(articleId) })
      await qc.invalidateQueries({ queryKey: queryKeys.articles.relations(toDelete.article.id) })
      setToDelete(null)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const relations = relQ.data ?? []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-sub">Связи</h3>
        <Button size="sm" variant="ghost" onClick={() => setModal('new')}>
          Добавить связь
        </Button>
      </div>
      {relQ.error && <ErrorBox error={relQ.error} onRetry={relQ.refetch} />}

      {relations.length === 0 && relQ.data && <p className="text-sm text-stone-500">Связей пока нет.</p>}
      <ul className="space-y-1.5">
        {relations.map((r) => {
          const [subject, verb, object] = relationParts(r.direction, r.relation_type, r.article.title)
          const isOther = (part) => part === r.article.title
          return (
            <li
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 ${
                r.visibility === 'gm_only' ? 'border-violet-800/70 bg-violet-950/20' : 'border-stone-700/60'
              }`}
            >
              <div className="min-w-0 text-sm text-stone-300">
                {r.visibility === 'gm_only' && (
                  <span className="mr-1" title="Секретная связь — игроки её не видят">
                    🔒
                  </span>
                )}
                <span className={isOther(subject) ? 'font-medium text-stone-100' : 'text-stone-400'}>{subject}</span>{' '}
                <span className="text-ember">{verb}</span>{' '}
                <span className={isOther(object) ? 'font-medium text-stone-100' : 'text-stone-400'}>{object}</span>{' '}
                <span className="text-xs text-stone-500">
                  ({articleTypeLabels[r.article.article_type] ?? r.article.article_type})
                </span>
                {r.note && <p className="mt-0.5 text-xs text-stone-400">{r.note}</p>}
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => setModal(r)}>
                  Изменить
                </Button>
                <Button size="xs" variant="danger" onClick={() => setToDelete(r)}>
                  Удалить
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {modal && (
        <RelationModal
          articleId={articleId}
          articleTitle={articleTitle}
          relation={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Удалить связь?"
          message={relationParts(toDelete.direction, toDelete.relation_type, `«${toDelete.article.title}»`).join(' ')}
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
