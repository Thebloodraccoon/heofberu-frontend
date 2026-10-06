import LoreIcon from './LoreIcon.jsx'
import { useId, useState } from 'react'
import { articlesApi } from '@/features/articles/api.js'
import { useArticleSubtypes, useRevisionDiff, useRevisionFeed } from '@/features/articles/queries.js'
import { FIELD_LABELS, fieldValue, formatDate, useWho } from '@/features/articles/history.js'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'

// unified-diff тела: подсветка добавленных/удалённых строк, служебные ---/+++/@@ приглушены.
function BodyDiff({ text }) {
  if (!text) return <p className="text-xs text-stone-500">Текст не менялся.</p>
  return (
    <pre className="article-diff-body">
      {text.split('\n').map((line, i) => {
        const tone = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')
          ? 'text-stone-500'
          : line.startsWith('+') ? 'text-emerald-300' : line.startsWith('-') ? 'text-red-300' : 'text-stone-400'
        return <span key={i} className={`article-diff-line ${tone} ${tone === 'text-emerald-300' ? 'article-diff-line--added' : tone === 'text-red-300' ? 'article-diff-line--removed' : ''}`}>{line || ' '}</span>
      })}
    </pre>
  )
}

// Diff версии или предложения: одинаковая форма ответа { fields, body_diff, against }.
function SubtypeValue({ value }) {
  // История может включать смену типа статьи, поэтому ищем в полном словаре.
  const subtypesQ = useArticleSubtypes()
  const subtype = subtypesQ.data?.find((item) => String(item.id) === String(value))
  if (subtype) return subtype.name
  if (subtypesQ.isLoading) return 'Загрузка…'
  if (subtypesQ.error) return 'Название подтипа недоступно'
  return 'Подтип удалён'
}

function DiffFieldValue({ field, value }) {
  if (field === 'subtype_id' && value != null && value !== '') return <SubtypeValue value={value} />
  return fieldValue(field, value)
}

export function DiffView({ diffQ, label }) {
  if (diffQ.isLoading) return <Skeleton className="h-16 w-full" />
  if (diffQ.error) return <ErrorBox error={diffQ.error} onRetry={diffQ.refetch} />
  const { fields, body_diff: bodyDiff, against } = diffQ.data
  const changed = Object.entries(fields)
  return (
    <div className="article-diff mt-2 space-y-2" aria-label={label}>
      <p className="text-xs text-stone-500">{against ? `Сравнение с версией ${against}` : 'Первая версия статьи'}</p>
      {changed.length > 0 && (
        <ul className="space-y-1 text-sm">
          {changed.map(([field, { old, new: next }]) => (
            <li key={field} className="article-diff-field">
              <h4 className="text-sm font-medium text-stone-300">{FIELD_LABELS[field] ?? field}</h4>
              <div className="article-diff-values">
                <div className="article-diff-old"><span className="article-diff-value-label">Было</span><p className="text-red-300"><DiffFieldValue field={field} value={old} /></p></div>
                <div className="article-diff-new"><span className="article-diff-value-label">Стало</span><p className="text-emerald-300"><DiffFieldValue field={field} value={next} /></p></div>
              </div>
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
  const panelId = useId()
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
      <h3 className="article-editor-label">История изменений</h3>
      <p className="text-xs text-stone-500">
        Читатели всегда видят последнюю версию. Здесь — все сохранения содержимого (название, описание, текст, тип, подтип, видимость).
      </p>
      <ul className="article-history-list">
        {items.map((revision) => {
          const isCurrent = revision.version === currentVersion
          const isOpen = openVersion === revision.version
          return (
            <li key={revision.version} className={`article-history-row ${isCurrent ? 'article-history-row--current' : ''}`}>
              <button type="button" className="article-history-toggle" aria-label={`${isOpen ? 'Скрыть изменения' : 'Изменения'} версии ${revision.version}`} aria-expanded={isOpen} aria-controls={`${panelId}-${revision.version}`} onClick={() => setOpenVersion(isOpen ? null : revision.version)}>
                <span className="article-history-summary">
                  <span className="flex flex-wrap items-center gap-2 text-sm text-stone-100">
                    <b>Версия {revision.version}</b>
                    {isCurrent && <Badge tone="good">текущая</Badge>}
                  </span>
                  <span className="article-history-title">{revision.title}</span>
                  <span className="article-history-meta">
                    <span>Правил: {who(revision.editor_id)}</span>
                    {revision.reviewer_id != null && revision.reviewer_id !== revision.editor_id && <span>Принял: {who(revision.reviewer_id)}</span>}
                    <span>{formatDate(revision.created_at)}</span>
                    {revision.content_hash && <code title={revision.content_hash}>{revision.content_hash.slice(0, 7)}</code>}
                  </span>
                  {revision.change_note && <span className="article-history-note">{translateChangeNote(revision.change_note)}</span>}
                </span>
                <LoreIcon name="chevron" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && <div id={`${panelId}-${revision.version}`} className="article-history-details">
                <RevisionDiff articleId={articleId} version={revision.version} />
                {canRestore && !isCurrent && <div className="article-history-actions">
                  <Button size="sm" variant="ghost" onClick={() => { setError(null); setRestoring(revision.version) }}><LoreIcon name="undo" />Восстановить версию</Button>
                </div>}
              </div>}

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

function translateChangeNote(note) {
  return note.replace(/^Restored version\s+(\d+)\b/i, 'Восстановлена версия $1')
}
