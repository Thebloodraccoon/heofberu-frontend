import { useState } from 'react'
import { Button, ErrorBox, Field, Input, RichTextEditor, Select, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import { campaignCharacterStatusLabels, campaignSessionStatusLabels } from '@/lib/i18n/index.js'
import { toApiDateTime, toLocalInputValue } from '@/lib/utils/datetime.js'
import { CAMPAIGN_SESSION_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useFullRoster, useSaveSession, useSetAttendance } from '@/features/campaigns/queries.js'
import { SECRET_TOOL } from './secretTool.jsx'

const fromSession = (session) => ({
  number: session?.number ? String(session.number) : '',
  title: session?.title ?? '',
  status: session?.status ?? 'planned',
  scheduled_at: toLocalInputValue(session?.scheduled_at),
  chronicle_markdown: session?.chronicle_markdown ?? '',
})

// ГМ планирует сессию (дата попадает в расписание игроков), потом отмечает, кто был, и пишет хронику.
// Хроника остаётся черновиком, пока её не опубликуют из карточки сессии.
// extra — блок под формой (страница сессии кладёт туда удаление).
export default function SessionFormDrawer({ campaign, session, onClose, onSaved, extra }) {
  const editing = Boolean(session)
  const { push } = useToasts()
  const [form, setForm] = useState(() => fromSession(session))
  const [attendees, setAttendees] = useState(() => new Set((session?.attendees ?? []).map((attendee) => attendee.participation_id)))
  const [failure, setFailure] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = useSaveSession(campaign.id)
  const attendance = useSetAttendance(campaign.id)
  const { data: roster = [], isLoading: rosterLoading } = useFullRoster(campaign.id)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const numberError = form.number && !(Number.isInteger(Number(form.number)) && Number(form.number) >= 1) ? 'Номер — целое число от 1.' : ''
  const toggle = (participationId) => setAttendees((current) => { const next = new Set(current); if (next.has(participationId)) next.delete(participationId); else next.add(participationId); return next })
  const attendanceChanged = editing
    ? attendees.size !== (session.attendees ?? []).length || (session.attendees ?? []).some((attendee) => !attendees.has(attendee.participation_id))
    : attendees.size > 0

  const submit = async (event) => {
    event.preventDefault()
    if (numberError || busy) return
    setBusy(true)
    setFailure(null)
    try {
      const body = {
        title: form.title.trim(),
        status: form.status,
        scheduled_at: toApiDateTime(form.scheduled_at),
        chronicle_markdown: form.chronicle_markdown,
        ...(form.number ? { number: Number(form.number) } : {}),
      }
      const saved = await save.mutateAsync(editing ? { sessionId: session.id, ...body } : body)
      if (attendanceChanged) await attendance.mutateAsync({ sessionId: saved.id, participationIds: [...attendees] })
      push(editing ? `Сессия №${saved.number} сохранена` : `Сессия №${saved.number} добавлена`, undefined, 'success')
      onSaved?.(saved)
    } catch (error) {
      setFailure(toCampaignError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer title={editing ? `Сессия №${session.number}` : 'Новая сессия'} subtitle={campaign.title} onClose={onClose} closeLabel="Закрыть форму сессии" footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button type="submit" form="session-form" disabled={Boolean(numberError) || busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</Button>
      </div>
    }>
      <form id="session-form" className="space-y-4" onSubmit={submit}>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3">
          <Field label="Номер"><Input type="number" min="1" step="1" value={form.number} onChange={set('number')} placeholder={editing ? '' : 'Следующий'} aria-invalid={Boolean(numberError)} /></Field>
          <Field label="Название"><Input value={form.title} maxLength={200} onChange={set('title')} placeholder="Например, «Маяк на скале»" /></Field>
        </div>
        {numberError && <p className="text-sm text-red-300" role="alert">{numberError}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Дата и время"><Input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} /></Field>
          <Field label="Статус"><Select value={form.status} onChange={set('status')}>{CAMPAIGN_SESSION_STATUSES.map((status) => <option key={status} value={status}>{campaignSessionStatusLabels[status]}</option>)}</Select></Field>
        </div>
        <p className="text-hint">Сессия с датой появится в расписании игроков. Время — ваше местное.</p>
        <fieldset className="lore-filter-section">
          <legend>Кто был</legend>
          {rosterLoading ? <Skeleton className="mt-3 h-10 w-full" /> : roster.length === 0
            ? <p className="mt-2 text-sm text-stone-400">В кампании пока нет персонажей.</p>
            : <div className="campaign-attendance" role="group" aria-label="Посещаемость">{roster.map((participation) => <button key={participation.id} type="button" className="lore-chip" aria-pressed={attendees.has(participation.id)} onClick={() => toggle(participation.id)}>{participation.character.name}{participation.status !== 'active' && <span className="text-hint">· {campaignCharacterStatusLabels[participation.status].toLowerCase()}</span>}</button>)}</div>}
        </fieldset>
        <div className="space-y-1.5">
          <span className="text-label">Хроника</span>
          <RichTextEditor value={form.chronicle_markdown} onChange={set('chronicle_markdown')} extraTools={[SECRET_TOOL]} rows={10} ariaLabel="Хроника сессии" placeholder="Что произошло за столом…" />
          <p className="text-hint">Игроки прочитают хронику после публикации, без блоков «Секрет мастера».</p>
        </div>
        {failure && <ErrorBox error={failure} onRetry={() => setFailure(null)} />}
      </form>
      {extra}
    </Drawer>
  )
}
