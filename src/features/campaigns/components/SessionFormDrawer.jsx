import { useEffect, useId, useRef, useState } from 'react'
import { Button, ErrorBox, Field, Input, RichTextEditor, Select, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import DateTimePicker from '@/components/ui/DateTimePicker.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { campaignCharacterStatusLabels, campaignSessionStatusLabels, sentenceCase } from '@/lib/i18n/index.js'
import { toApiDateTime, toLocalInputValue } from '@/lib/utils/datetime.js'
import { CAMPAIGN_SESSION_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useFullRoster, useSaveSession, useSetAttendance } from '@/features/campaigns/queries.js'
import StatusBadge from './StatusBadge.jsx'
import { SECRET_TOOL } from './secretTool.jsx'

const fromSession = (session) => ({
  number: session?.number ? String(session.number) : '',
  title: session?.title ?? '',
  status: session?.status ?? 'planned',
  scheduled_at: toLocalInputValue(session?.scheduled_at),
  chronicle_markdown: session?.chronicle_markdown ?? '',
})
const sameForm = (left, right) => Object.keys(left).every((key) => left[key] === right[key])
const STATUS_HINTS = {
  planned: 'Сначала запланируйте игру. После неё можно отметить присутствовавших и опубликовать хронику.',
  played: 'Игра состоялась. Проверьте присутствовавших и подготовьте хронику к публикации.',
  cancelled: 'Сессия отменена. При необходимости дату и статус можно изменить позже.',
}

export default function SessionFormDrawer({ campaign, session, onClose, onSaved, deleteAction }) {
  const editing = Boolean(session)
  const { push } = useToasts()
  const id = useId()
  const [initial] = useState(() => fromSession(session))
  const [initialAttendees] = useState(() => (session?.attendees ?? []).map((attendee) => attendee.participation_id))
  const [form, setForm] = useState(initial)
  const [attendees, setAttendees] = useState(() => new Set(initialAttendees))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [chronicleOpen, setChronicleOpen] = useState(() => Boolean(session?.chronicle_markdown))
  const [confirming, setConfirming] = useState(null)
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  // Сессия и явка сохраняются отдельно. После ошибки явки повторяем её по уже созданному id.
  const [checkpoint, setCheckpoint] = useState(() => session ? { record: session, form: initial } : null)
  const savingRef = useRef(false)
  const save = useSaveSession(campaign.id)
  const attendance = useSetAttendance(campaign.id)
  const rosterQuery = useFullRoster(campaign.id)
  const roster = rosterQuery.data ?? []
  const missingAttendees = (session?.attendees ?? []).filter((attendee) => !roster.some((participation) => participation.id === attendee.participation_id))
  const participants = [...roster, ...missingAttendees.map((attendee) => ({ id: attendee.participation_id, character: { name: attendee.character_name }, owner: attendee.owner }))]
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const numberError = form.number && !(Number.isSafeInteger(Number(form.number)) && Number(form.number) >= 1) ? 'Номер — целое число от 1.' : ''
  const attendanceChanged = attendees.size !== initialAttendees.length || initialAttendees.some((participationId) => !attendees.has(participationId))
  const dirty = !sameForm(checkpoint?.form ?? initial, form) || attendanceChanged
  const pending = busy || deleteAction?.isPending
  const attendanceLabel = form.status === 'played' ? 'Кто присутствовал' : 'Участники'
  const toggle = (participationId) => setAttendees((current) => {
    const next = new Set(current)
    if (next.has(participationId)) next.delete(participationId)
    else next.add(participationId)
    return next
  })

  useEffect(() => {
    if (!dirty && !pending) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])

  const requestClose = () => {
    if (pending || savingRef.current) return
    if (dirty) setConfirming('close')
    else onClose()
  }
  const submit = async () => {
    if (numberError || pending || savingRef.current || (editing && !dirty)) return
    savingRef.current = true
    setBusy(true)
    setFailure(null)
    let stage = 'session'
    try {
      let saved = checkpoint?.record
      if (!checkpoint || !sameForm(checkpoint.form, form)) {
        const body = {
          title: form.title.trim(),
          status: form.status,
          scheduled_at: toApiDateTime(form.scheduled_at),
          chronicle_markdown: form.chronicle_markdown,
          ...(form.number ? { number: Number(form.number) } : {}),
        }
        saved = await save.mutateAsync(saved ? { sessionId: saved.id, ...body } : body)
        setCheckpoint({ record: saved, form: { ...form } })
      }
      if (attendanceChanged) {
        stage = 'attendance'
        await attendance.mutateAsync({ sessionId: saved.id, participationIds: [...attendees] })
      }
      push(editing ? `Сессия №${saved.number} сохранена` : `Сессия №${saved.number} добавлена`, undefined, 'success')
      onSaved?.(saved)
    } catch (error) {
      setFailure({ error: toCampaignError(error), stage })
    } finally {
      savingRef.current = false
      setBusy(false)
    }
  }
  const confirmation = confirming ? {
    title: confirming === 'delete' ? 'Удалить сессию?' : 'Закрыть без сохранения?',
    message: confirming === 'delete'
      ? `Вместе с сессией удалятся отметки посещаемости и отзывы игроков о ней.${dirty ? ' Несохранённые изменения будут отменены.' : ''}`
      : `${!editing && checkpoint ? `Сессия №${checkpoint.record.number} уже создана. ` : ''}Несохранённые изменения и выбор участников будут отменены.`,
    confirmText: confirming === 'delete' ? 'Удалить сессию' : !editing && checkpoint ? 'Закрыть' : 'Не сохранять',
    busyText: 'Удаляем…',
    busy: pending,
    error: confirming === 'delete' && deleteAction?.error ? toCampaignError(deleteAction.error) : null,
    onCancel: () => { if (!pending) { setConfirming(null); deleteAction?.reset?.() } },
    onConfirm: () => { if (!pending) { if (confirming === 'delete') deleteAction.run(); else onClose() } },
  } : null

  return (
    <Drawer title={editing ? `Сессия №${session.number}` : 'Новая сессия'} subtitle={campaign.title} onClose={requestClose} confirmation={confirmation} closeLabel="Закрыть форму сессии" className="campaign-form-drawer session-form-drawer" footer={
      <div className="article-filter-actions">
        <Button variant="ghost" disabled={pending} onClick={requestClose}>Отмена</Button>
        <Button type="submit" form={`${id}-form`} disabled={Boolean(numberError) || pending || (editing && !dirty)}>{busy ? 'Сохраняем…' : editing ? 'Сохранить' : checkpoint ? 'Завершить создание' : 'Создать сессию'}</Button>
      </div>
    }>
      <form id={`${id}-form`} noValidate onSubmit={(event) => { event.preventDefault(); submit() }}>
        <fieldset disabled={pending} className="campaign-drawer-form">
          <section className="campaign-drawer-section">
            <h3 className="article-editor-label">Основное</h3>
            <Field label="Название"><Input value={form.title} maxLength={200} onChange={set('title')} placeholder="Например, «Маяк на скале»" aria-describedby={`${id}-title-hint`} /></Field>
            <p id={`${id}-title-hint`} className="text-hint">Необязательно. Без названия будет показан номер сессии.</p>
          </section>
          <section className="campaign-drawer-section">
            <h3 className="article-editor-label">Когда играем</h3>
            <Field label="Дата и время"><DateTimePicker value={form.scheduled_at} disabled={pending} onChange={set('scheduled_at')} aria-describedby={`${id}-date-hint`} /></Field>
            {!form.scheduled_at && <p className="text-hint">Дата не назначена. Можно добавить позже.</p>}
            <p id={`${id}-date-hint`} className="text-hint">Время — ваше местное. Сессия с датой появится в расписании игроков.</p>
          </section>
          <section className="campaign-drawer-section" aria-labelledby={`${id}-attendees-label`}>
            <h3 id={`${id}-attendees-label`} className="article-editor-label">{attendanceLabel}</h3>
            <p className="text-hint">{form.status === 'played' ? 'Отметьте персонажей, которые участвовали в игре.' : 'Выберите персонажей для этой сессии. Отметки можно изменить после игры.'}</p>
            {rosterQuery.isLoading && <div className="space-y-3" aria-busy="true"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
            {rosterQuery.error && <ErrorBox error={toCampaignError(rosterQuery.error)} onRetry={rosterQuery.refetch} />}
            {!rosterQuery.isLoading && !rosterQuery.error && (participants.length === 0
              ? <p className="text-hint">В кампании пока нет персонажей. Их можно добавить во вкладке «Состав».</p>
              : <div className="session-participants" role="group" aria-label={attendanceLabel}>{participants.map((participation) => <button key={participation.id} type="button" className="campaign-candidate-card" aria-pressed={attendees.has(participation.id)} onClick={() => toggle(participation.id)}>
                <span className="campaign-candidate-avatar" aria-hidden="true">{(participation.character.name || '?').slice(0, 1).toUpperCase()}</span>
                <span className="campaign-candidate-body"><strong className="campaign-picker-title">{participation.character.name}</strong>{participation.owner?.username && <span className="text-hint">@{participation.owner.username}</span>}
                  <span className="campaign-candidate-meta">{[participation.character.level != null && `${participation.character.level} ур.`, participation.character.class_name && sentenceCase(participation.character.class_name), participation.status !== 'active' && (participation.status ? campaignCharacterStatusLabels[participation.status] : 'Нет в текущем составе')].filter(Boolean).join(' · ')}</span>
                </span>
              </button>)}</div>)}
          </section>
          <section className="session-form-disclosure">
            <button type="button" className="session-form-disclosure-toggle" aria-expanded={chronicleOpen} aria-controls={`${id}-chronicle`} onClick={() => setChronicleOpen((open) => !open)}><span><span className="article-editor-label">Хроника</span><span className="text-hint">Можно заполнить после игры.</span></span><LoreIcon name="chevron" /></button>
            <div id={`${id}-chronicle`} hidden={!chronicleOpen}>
              <div className="campaign-drawer-section session-form-disclosure-body">
                <RichTextEditor value={form.chronicle_markdown} disabled={pending} onChange={set('chronicle_markdown')} extraTools={[SECRET_TOOL]} rows={8} ariaLabel="Хроника сессии" placeholder="Что произошло за столом…" />
                <p className="text-hint">{session?.published_at ? 'Хроника опубликована. Сохранённые изменения станут видны игрокам, кроме секретов мастера.' : 'Игроки прочитают хронику после публикации, без блоков «Секрет мастера».'}</p>
              </div>
            </div>
          </section>
          <section className="session-form-disclosure">
            <button type="button" className="session-form-disclosure-toggle" aria-expanded={advancedOpen} aria-controls={`${id}-advanced`} onClick={() => setAdvancedOpen((open) => !open)}><span><span className="article-editor-label">Дополнительные параметры</span><span className="text-hint">Номер и статус сессии.</span></span><LoreIcon name="chevron" /></button>
            <div id={`${id}-advanced`} hidden={!advancedOpen}>
              <div className="campaign-drawer-section session-form-disclosure-body">
                <Field label="Номер"><Input type="number" min="1" step="1" value={form.number} onChange={set('number')} placeholder={editing ? 'Текущий номер' : 'Автоматически'} aria-invalid={Boolean(numberError)} aria-describedby={`${id}-number-hint`} /></Field>
                <p id={`${id}-number-hint`} className="text-hint">{editing ? 'Оставьте пустым, чтобы сохранить текущий номер.' : 'Если не указать номер, он назначится автоматически.'}</p>
                <Field label="Статус"><Select value={form.status} onChange={set('status')}>{CAMPAIGN_SESSION_STATUSES.map((status) => <option key={status} value={status}>{campaignSessionStatusLabels[status]}</option>)}</Select></Field>
              </div>
            </div>
            {numberError && <p className="text-sm text-red-300" role="alert">{numberError}</p>}
          </section>
          <p className="campaign-drawer-note" role="status"><StatusBadge kind="session" status={form.status} /><span>{STATUS_HINTS[form.status]}</span></p>
          {failure && <div role="alert" className="campaign-drawer-section">{failure.stage === 'attendance' && <p className="text-hint">Сессия №{checkpoint?.record.number} сохранена, но участники не сохранены. Повторная попытка продолжит сохранение этой сессии.</p>}<ErrorBox error={failure.error} onRetry={submit} /></div>}
        </fieldset>
      </form>
      {editing && deleteAction && <section className="campaign-settings-archive" aria-label="Удаление сессии"><h3 className="article-editor-label">Удаление</h3><p className="text-hint">Вместе с сессией удалятся отметки посещаемости и отзывы игроков о ней.</p><Button variant="danger" disabled={pending} onClick={() => setConfirming('delete')}><LoreIcon name="trash" />Удалить сессию</Button></section>}
    </Drawer>
  )
}
