import { useState } from 'react'
import { articlesApi } from '@/features/articles/api.js'
import { useArticleRevisions, useRevisionDiff } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { articleTypeLabels, articleVisibilityLabels } from '@/lib/i18n'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'

const PAGE_SIZE = 20
const FIELD_LABELS = {
  title: 'Название',
  excerpt: 'Краткое описание',
  article_type: 'Тип',
  subtype_id: 'Подтип',
  visibility: 'Видимость',
}

const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

function fieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'article_type') return articleTypeLabels[value] ?? value
  if (field === 'visibility') return articleVisibilityLabels[value] ?? value
  return String(value)
}

// unified-diff тела: подсветка добавленных/удалённых строк, служебные ---/+++/@@ приглушены.
function BodyDiff({ text }) {
  if (!text) return <p className="text-xs text-stone-500">Текст не менялся.</p>
  return (
    <pre className="max-h-80 overflow-auto rounded border border-stone-700/60 bg-stone-950/60 p-3 text-xs leading-relaxed whitespace-pre-wrap">
      {text.split('\n').map((line, i) => {
        const tone = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')
          ? 'text-stone-500'
          : line.startsWith('+') ? 'text-emerald-300' : line.startsWith('-') ? 'text-red-300' : 'text-stone-400'
        return <span key={i} className={`block ${tone}`}>{line || ' '}</span>
      })}
    </pre>
  )
}

function RevisionDiff({ articleId, version }) {
  const diffQ = useRevisionDiff(articleId, version)
  if (diffQ.isLoading) return <Skeleton className="h-16 w-full" />
  if (diffQ.error) return <ErrorBox error={diffQ.error} onRetry={diffQ.refetch} />
  const { fields, body_diff: bodyDiff, against } = diffQ.data
  const changed = Object.entries(fields)
  return (
    <div className="mt-2 space-y-2" aria-label={`Изменения версии ${version}`}>
      <p className="text-xs text-stone-500">{against ? `Сравнение с версией ${against}` : 'Первая версия статьи'}</p>
      {changed.length > 0 && (
        <ul className="space-y-1 text-sm">
          {changed.map(([field, { old, new: next }]) => (
            <li key={field}>
              <span className="text-stone-400">{FIELD_LABELS[field] ?? field}: </span>
              <span className="text-red-300 line-through">{fieldValue(field, old)}</span>
              {' → '}
              <span className="text-emerald-300">{fieldValue(field, next)}</span>
            </li>
          ))}
        </ul>
      )}
      <BodyDiff text={bodyDiff} />
    </div>
  )
}

// История изменений статьи (только ГМ): кто и когда сохранил версию, что в ней изменилось
// и — для автора и основателя — возврат к старой версии (он создаёт НОВУЮ версию, история не стирается).
export default function ArticleHistory({ articleId, currentVersion, canRestore, onRestored }) {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [openVersion, setOpenVersion] = useState(null)
  const [restoring, setRestoring] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const historyQ = useArticleRevisions(articleId, { page, size: PAGE_SIZE })

  const restore = async () => {
    setBusy(true)
    setError(null)
    try {
      const saved = await articlesApi.revisions.restore(articleId, restoring)
      setRestoring(null)
      setOpenVersion(null)
      setPage(1)
      onRestored?.(saved)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  if (historyQ.isLoading) return <Skeleton className="h-32 w-full" />
  if (historyQ.error) return <ErrorBox error={historyQ.error} onRetry={historyQ.refetch} />

  const { items, total } = historyQ.data
  return (
    <div className="space-y-3">
      <h3 className="heading-sub">История изменений</h3>
      <p className="text-xs text-stone-500">
        Читатели всегда видят последнюю версию. Здесь — все сохранения содержимого (название, описание, текст, тип, подтип, видимость).
      </p>
      <ul className="space-y-2">
        {items.map((revision) => {
          const isCurrent = revision.version === currentVersion
          const isOpen = openVersion === revision.version
          return (
            <li key={revision.version} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-stone-100">
                    <b>Версия {revision.version}</b>
                    {isCurrent && <Badge tone="good">текущая</Badge>}
                    <span className="truncate text-stone-300">{revision.title}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatDate(revision.created_at)} ·{' '}
                    {revision.editor_id == null ? 'автор неизвестен' : String(revision.editor_id) === String(user?.id) ? 'вы' : `пользователь #${revision.editor_id}`}
                    {revision.change_note ? ` · ${revision.change_note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" aria-expanded={isOpen} onClick={() => setOpenVersion(isOpen ? null : revision.version)}>
                    {isOpen ? 'Скрыть изменения' : 'Изменения'}
                  </Button>
                  {canRestore && !isCurrent && (
                    <Button size="sm" variant="ghost" onClick={() => { setError(null); setRestoring(revision.version) }}>
                      Восстановить
                    </Button>
                  )}
                </div>
              </div>
              {isOpen && <RevisionDiff articleId={articleId} version={revision.version} />}
            </li>
          )
        })}
      </ul>
      <Pagination page={page} total={total} size={PAGE_SIZE} onPage={setPage} />

      {restoring && (
        <ConfirmDialog
          title={`Восстановить версию ${restoring}?`}
          message="Содержимое этой версии станет текущим как новая версия. Статус, адрес и положение статьи в дереве не изменятся, история сохранится."
          confirmText="Да, восстановить"
          busyText="Восстанавливаем..."
          busy={busy}
          error={error}
          onCancel={() => setRestoring(null)}
          onConfirm={restore}
        />
      )}
    </div>
  )
}
