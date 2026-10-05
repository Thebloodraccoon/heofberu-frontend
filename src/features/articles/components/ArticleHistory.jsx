import { useState } from 'react'
import { articlesApi } from '@/features/articles/api.js'
import { useRevisionDiff, useRevisionFeed } from '@/features/articles/queries.js'
import { FIELD_LABELS, fieldValue, formatDate, useWho } from '@/features/articles/history.js'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'

// unified-diff тела как на GitHub: добавленные/удалённые строки — фоном на всю ширину
// с контрастным текстом, служебные ---/+++/@@ приглушены.
function BodyDiff({ text }) {
  if (!text) return <p className="text-xs text-stone-500">Текст не менялся.</p>
  return (
    <pre className="max-h-80 overflow-auto rounded border border-stone-700/60 bg-stone-950/60 py-2 text-xs leading-relaxed whitespace-pre-wrap">
      {text.split('\n').map((line, i) => {
        const tone = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')
          ? 'text-stone-500'
          : line.startsWith('+') ? 'bg-emerald-900/50 text-emerald-200'
            : line.startsWith('-') ? 'bg-red-900/50 text-red-200' : 'text-stone-400'
        return <span key={i} className={`block px-3 ${tone}`}>{line || ' '}</span>
      })}
    </pre>
  )
}

// Diff версии или предложения: одинаковая форма ответа { fields, body_diff, against }.
export function DiffView({ diffQ, label }) {
  if (diffQ.isLoading) return <Skeleton className="h-16 w-full" />
  if (diffQ.error) return <ErrorBox error={diffQ.error} onRetry={diffQ.refetch} />
  const { fields, body_diff: bodyDiff, against } = diffQ.data
  const changed = Object.entries(fields)
  return (
    <div className="mt-2 space-y-2" aria-label={label}>
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
function RevisionDiff({ articleId, version }) {
  return <DiffView diffQ={useRevisionDiff(articleId, version)} label={`Изменения версии ${version}`} />
}

// «Показать ещё» для лент истории и предложений.
export function FeedMore({ feed, label = 'Показать ещё' }) {
  if (!feed.hasNextPage) return null
  return (
    <div className="flex justify-center">
      <Button size="sm" variant="ghost" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
        {feed.isFetchingNextPage ? 'Загружаем...' : label}
      </Button>
    </div>
  )
}

export default function ArticleHistory({ articleId, currentVersion, canRestore, onRestored }) {
  const who = useWho()
  const [openVersion, setOpenVersion] = useState(null)
  const [restoring, setRestoring] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const historyQ = useRevisionFeed(articleId)

  const restore = async () => {
    setBusy(true)
    setError(null)
    try {
      const saved = await articlesApi.revisions.restore(articleId, restoring)
      setRestoring(null)
      setOpenVersion(null)
      onRestored?.(saved)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  if (historyQ.isLoading) return <Skeleton className="h-32 w-full" />
  if (historyQ.error) return <ErrorBox error={historyQ.error} onRetry={historyQ.refetch} />

  const { items } = historyQ
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
                  <div className="mt-1 space-y-0.5 text-xs text-stone-500">
                    <p>
                      {revision.content_hash && (
                        <code className="mr-1.5 text-stone-400" title={revision.content_hash}>{revision.content_hash.slice(0, 7)}</code>
                      )}
                      {formatDate(revision.created_at)}
                    </p>
                    <p>Правил: <span className="text-stone-300">{who(revision.editor_id)}</span></p>
                    {revision.reviewer_id != null && revision.reviewer_id !== revision.editor_id && (
                      <p>Принял: <span className="text-stone-300">{who(revision.reviewer_id)}</span></p>
                    )}
                  </div>
                  {revision.change_note && <p className="mt-0.5 text-xs text-stone-300">{revision.change_note}</p>}
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
      <FeedMore feed={historyQ} label="Более ранние версии" />

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
