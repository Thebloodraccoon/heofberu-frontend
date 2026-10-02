import { useState } from 'react'
import { useArticleSubtypes, useProposalFeed, useCreateProposal, useProposal, useProposalDiff, useReviewProposal } from '@/features/articles/queries.js'
import { formatDate, useWho } from '@/features/articles/history.js'
import { useAuth } from '@/features/auth/useAuth.js'
import UnsavedGuard from '@/features/articles/components/UnsavedGuard.jsx'
import ProposalConflictDialog from '@/features/articles/components/ProposalConflictDialog.jsx'
import { mergeConflicts } from '@/features/articles/proposalMerge.js'
import { FIELD_LABELS } from '@/features/articles/history.js'
import { DiffView, FeedMore } from '@/features/articles/components/ArticleHistory.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'
import { articleTypeLabels } from '@/lib/i18n'
import { Badge, Button, ConfirmDialog, ErrorBox, Field, Input, Modal, RichTextEditor, Skeleton, TextArea } from '@/components/ui'

const STATUS_BADGES = {
  pending: ['ждёт решения', 'accent'],
  accepted: ['принято', 'good'],
  rejected: ['отклонено', 'bad'],
  withdrawn: ['отозвано', 'default'],
}
const CLOSED = ['accepted', 'rejected', 'withdrawn']
const NOTE_MAX = 300

function ProposalDiff({ articleId, pid }) {
  return <DiffView diffQ={useProposalDiff(articleId, pid)} label={`Изменения предложения ${pid}`} />
}

// Статья целиком в том виде, какой она станет после принятия предложения.
function ProposalPreview({ articleId, proposal, footer, onClose }) {
  const q = useProposal(articleId, proposal.id)
  const subtypes = useArticleSubtypes(q.data?.article_type)
  const p = q.data
  const subtype = p?.subtype_id != null ? subtypes.data?.find((s) => s.id === p.subtype_id)?.name : null
  return (
    <Modal title={`Предпросмотр: ${proposal.title}`} subtitle="Так статья будет выглядеть после принятия" size="4xl" scroll maxH="94vh" onClose={onClose} footer={footer}>
      {q.isLoading && <Skeleton className="h-64 w-full" />}
      {q.error && <ErrorBox error={q.error} onRetry={q.refetch} />}
      {p && (
        <article className="space-y-4">
          <header className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-stone-100">{p.title}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-stone-400">
              {articleTypeLabels[p.article_type] ?? p.article_type}
              {subtype && ` · ${subtype}`}
              {p.visibility === 'gm_only' && <GmOnlyBadge />}
            </p>
            {p.excerpt && <p className="text-stone-300">{p.excerpt}</p>}
          </header>
          <ArticleText value={p.body_markdown} />
        </article>
      )}
    </Modal>
  )
}

// Шапка предложения: статус, заголовок, когда/кто/кем разобрано, комментарий и причина отклонения.
function ProposalSummary({ proposal: p }) {
  const who = useWho()
  const [badge, tone] = STATUS_BADGES[p.status] ?? [p.status, 'default']
  const reviewed = { accepted: 'Принял', rejected: 'Отклонил' }[p.status]
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-100">
        <Badge tone={tone}>{badge}</Badge>
        {p.is_stale && <Badge tone="bad">устарело</Badge>}
        <span className="truncate text-stone-300">{p.title}</span>
      </p>
      <div className="mt-1 space-y-0.5 text-xs text-stone-500">
        <p>
          {formatDate(p.created_at)} · к версии {p.base_version}
          {p.accepted_version != null && ` → стала версией ${p.accepted_version}`}
        </p>
        <p>Предложил: <span className="text-stone-300">{who(p.proposer_id)}</span></p>
        {reviewed && p.reviewer_id != null && <p>{reviewed}: <span className="text-stone-300">{who(p.reviewer_id)}</span></p>}
      </div>
      {p.change_note && <p className="mt-0.5 text-xs text-stone-300">{p.change_note}</p>}
      {p.review_note && <p className="mt-0.5 text-xs text-stone-300"><span className="text-stone-500">Причина отклонения:</span> {p.review_note}</p>}
    </div>
  )
}

// Отклонение с необязательной причиной — её увидит предложивший.
function RejectDialog({ proposal, busy, error, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title={`Отклонить предложение «${proposal.title}»?`} onClose={busy ? undefined : onCancel} tone="danger">
      <p className="text-body">Изменения не попадут в статью. Предложение останется в списке отклонённых.</p>
      <Field label="Причина (необязательно)" className="mt-3">
        <TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={NOTE_MAX} />
      </Field>
      {error && <ErrorBox className="mt-3" error={error} />}
      <div className="mt-6 modal-actions">
        <Button variant="ghost" disabled={busy} onClick={onCancel}>Отмена</Button>
        <Button variant="danger" disabled={busy} onClick={() => onConfirm(reason.trim())}>{busy ? 'Отклоняем...' : 'Отклонить'}</Button>
      </div>
    </Modal>
  )
}

// 409: конфликт слияния с текущей версией (details) или предложение уже закрыто.
const reviewError = (e, proposal, mine) => {
  if (e?.status !== 409) return e
  const details = mergeConflicts(e)
  if (!details) return new Error('Предложение уже закрыто или изменилось — обновите список.', { cause: e })
  const what = [
    ...(details.conflicts ?? []).map((c) => FIELD_LABELS[c.field] ?? c.field),
    ...(details.body_conflicts?.length ? [`текст (${details.body_conflicts.length})`] : []),
  ].join(', ')
  return new Error(
    mine
      ? `Ваши правки пересеклись с изменениями после версии ${proposal.base_version}: ${what}. Разрешите конфликт.`
      : `Статью изменили после версии ${proposal.base_version}, и правки пересеклись: ${what}. Разрешить конфликт может только тот, кто предложил, — или отклоните предложение.`,
    { cause: e },
  )
}

// Список предложений правок статьи. Видят все ГМ; принимать/отклонять — автор статьи или основатель,
// отозвать своё ждущее предложение — тот, кто его сделал.
export default function ArticleProposals({ articleId, canReview, onAccepted }) {
  const { user, isFounder } = useAuth()
  const [hideClosed, setHideClosed] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [withdrawing, setWithdrawing] = useState(null)
  const [previewing, setPreviewing] = useState(null)
  const [resolving, setResolving] = useState(null) // { proposal, details } — окно конфликтов
  const [error, setError] = useState(null)
  const review = useReviewProposal(articleId)
  // Две ленты «Показать ещё»: ждущие решения — сверху, ниже — закрытые (новые первыми).
  const pendingQ = useProposalFeed(articleId, ['pending'])
  const closedQ = useProposalFeed(articleId, CLOSED, { enabled: !hideClosed })
  const closed = hideClosed ? [] : closedQ.items
  const loading = pendingQ.isLoading || (!hideClosed && closedQ.isLoading)
  const isMine = (p) => user?.id != null && String(p.proposer_id) === String(user.id)
  // Своё предложение не разбирают сами — решает автор статьи. Основатель — исключение: он может и принять своё.
  const mayReview = (p) => canReview && p.status === 'pending' && (!isMine(p) || isFounder)

  // Устаревшее предложение принимается со слиянием (accept?rebase=true): без конфликтов — сразу.
  const act = (proposal, action, body) => {
    setError(null)
    const params = action === 'accept' && proposal.is_stale ? { rebase: true } : undefined
    review.mutate(
      { pid: proposal.id, action, body, params },
      {
        onSuccess: (saved) => {
          setRejecting(null)
          setWithdrawing(null)
          setPreviewing(null)
          if (action === 'accept') onAccepted?.(saved)
        },
        onError: (e) => {
          const details = mergeConflicts(e)
          if (details && isMine(proposal)) {
            setPreviewing(null)
            setResolving({ proposal, details })
          }
          setError({ id: proposal.id, error: reviewError(e, proposal, isMine(proposal)) })
        },
      },
    )
  }

  const dialogOpen = rejecting || withdrawing
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="heading-sub">Предложения правок</h3>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <input type="checkbox" checked={hideClosed} onChange={(e) => { setHideClosed(e.target.checked); setOpenId(null) }} />
          Скрыть закрытые
        </label>
      </div>
      <p className="text-xs text-stone-500">
        Другие ГМ не правят статью напрямую, а предлагают изменения. Принятое предложение становится новой версией: в истории будет записан и предложивший, и принявший.
      </p>

      {loading && <Skeleton className="h-24 w-full" />}
      {pendingQ.error && <ErrorBox error={pendingQ.error} onRetry={pendingQ.refetch} />}
      {!hideClosed && closedQ.error && <ErrorBox error={closedQ.error} onRetry={closedQ.refetch} />}
      {!loading && pendingQ.items.length + closed.length === 0 && (
        <p className="py-4 text-sm text-stone-500">{hideClosed ? 'Нет предложений, ждущих решения.' : 'Предложений нет.'}</p>
      )}
      {[[pendingQ.items, pendingQ, 'Ещё ждущие решения'], [closed, closedQ, 'Более ранние предложения']].map(([list, feed, more], i) => (
        <div key={i} className="space-y-2">
          <ul className="space-y-2">
            {list.map((p) => {
              const isOpen = openId === p.id
              const busy = review.isPending && review.variables?.pid === p.id
              const pending = p.status === 'pending'
              return (
                <li key={p.id} className={`rounded-lg border p-3 ${pending ? 'border-ember/60 bg-ember/10' : 'border-stone-700/60 bg-stone-900/60'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ProposalSummary proposal={p} />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="ghost" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : p.id)}>
                        {isOpen ? 'Скрыть изменения' : 'Изменения'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setError(null); setPreviewing(p) }}>
                        Предпросмотр
                      </Button>
                      {mayReview(p) && (
                        <>
                          <Button size="sm" disabled={busy} onClick={() => act(p, 'accept')}>
                            {busy && review.variables?.action === 'accept' ? 'Принимаем...' : 'Принять'}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setError(null); setRejecting(p) }}>
                            Отклонить
                          </Button>
                        </>
                      )}
                      {pending && p.is_stale && (isMine(p) || canReview) && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(p, 'rebase')}>
                          {busy && review.variables?.action === 'rebase' ? 'Обновляем...' : 'Обновить до текущей версии'}
                        </Button>
                      )}
                      {pending && isMine(p) && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setError(null); setWithdrawing(p) }}>
                          Отозвать
                        </Button>
                      )}
                    </div>
                  </div>
                  {error?.id === p.id && !dialogOpen && <ErrorBox className="mt-2" error={error.error} />}
                  {error?.id === p.id && !dialogOpen && isMine(p) && mergeConflicts(error.error.cause) && !resolving && (
                    <Button size="sm" className="mt-2" onClick={() => setResolving({ proposal: p, details: mergeConflicts(error.error.cause) })}>
                      Разрешить конфликт
                    </Button>
                  )}
                  {isOpen && <ProposalDiff articleId={articleId} pid={p.id} />}
                </li>
              )
            })}
          </ul>
          {(i === 0 || !hideClosed) && <FeedMore feed={feed} label={more} />}
        </div>
      ))}

      {previewing && (
        <ProposalPreview
          articleId={articleId}
          proposal={previewing}
          onClose={() => setPreviewing(null)}
          footer={
            <>
              {error?.id === previewing.id && <ErrorBox className="mr-auto" error={error.error} />}
              {mayReview(previewing) && (
                <>
                  <Button variant="ghost" disabled={review.isPending} onClick={() => { setError(null); setRejecting(previewing) }}>Отклонить</Button>
                  <Button disabled={review.isPending} onClick={() => act(previewing, 'accept')}>
                    {review.isPending && review.variables?.action === 'accept' ? 'Принимаем...' : 'Принять'}
                  </Button>
                </>
              )}
            </>
          }
        />
      )}

      {rejecting && (
        <RejectDialog
          proposal={rejecting}
          busy={review.isPending}
          error={error?.id === rejecting.id ? error.error : null}
          onCancel={() => setRejecting(null)}
          onConfirm={(reason) => act(rejecting, 'reject', reason ? { reason } : undefined)}
        />
      )}

      {resolving && (
        <ProposalConflictDialog
          articleId={articleId}
          proposal={resolving.proposal}
          details={resolving.details}
          onClose={() => setResolving(null)}
          onResolved={() => {
            setResolving(null)
            setError(null)
          }}
        />
      )}

      {withdrawing && (
        <ConfirmDialog
          title={`Отозвать предложение «${withdrawing.title}»?`}
          message="Предложение закроется и больше не будет ждать решения. Если понадобится, предложите правку заново."
          confirmText="Отозвать"
          busyText="Отзываем..."
          busy={review.isPending}
          error={error?.id === withdrawing.id ? error.error : null}
          onCancel={() => setWithdrawing(null)}
          onConfirm={() => act(withdrawing, 'withdraw')}
        />
      )}
    </div>
  )
}

// Форма предложения для ГМ, который не автор: те же текстовые поля, что у автора, плюс комментарий.
// Отправляются только изменённые поля — остальное бэк берёт из текущей версии.
export function ProposalForm({ articleId, values, onDone, onCancel }) {
  const create = useCreateProposal(articleId)
  const [draft, setDraft] = useState({ title: values.title, excerpt: values.excerpt ?? '', body_markdown: values.body_markdown ?? '' })
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const changed = Object.fromEntries(
    Object.entries(draft).filter(([k, v]) => (v ?? '') !== (values[k] ?? '')),
  )
  const dirty = Object.keys(changed).length > 0 || !!note.trim()
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    setError(null)
    if (!Object.keys(changed).length) return setError(new Error('Вы ничего не изменили.'))
    if ('title' in changed && !draft.title.trim()) return setError(new Error('Название не может быть пустым.'))
    const body = { ...changed, change_note: note.trim() || null }
    if ('title' in body) body.title = body.title.trim()
    if ('excerpt' in body) body.excerpt = body.excerpt.trim() || null
    create.mutate(body, { onSuccess: onDone, onError: setError })
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Предложение правки">
      <UnsavedGuard when={dirty && !create.isPending && !create.isSuccess} />
      <Field label="Название"><Input value={draft.title} onChange={set('title')} /></Field>
      <Field label="Краткое описание"><TextArea value={draft.excerpt} onChange={set('excerpt')} rows={2} /></Field>
      <div className="space-y-1.5">
        <span className="text-label">Текст (Markdown)</span>
        <RichTextEditor value={draft.body_markdown} onChange={set('body_markdown')} rows={16} ariaLabel="Текст предложения" />
      </div>
      <Field label="Что и зачем изменено">
        <Input value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="Например: исправил даты правления" />
      </Field>
      {error && <ErrorBox error={error} />}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? 'Отправляем...' : 'Отправить предложение'}</Button>
        <Button type="button" size="sm" variant="ghost" disabled={create.isPending} onClick={onCancel}>Отмена</Button>
      </div>
    </form>
  )
}
