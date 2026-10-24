import { useState } from 'react'
import { Button, ConfirmDialog, ErrorBox, TextArea } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { toCampaignError } from '@/features/campaigns/errors.js'

const MAX_LENGTH = 5000

// Свой отзыв игрока: о кампании или о сессии (тогда есть переключатель «видно всему столу»).
// Отзыв один на игрока — повторная отправка заменяет текст.
export default function ReviewForm({ mine, label, withTableToggle = false, write, remove }) {
  const [editing, setEditing] = useState(!mine)
  const [body, setBody] = useState(mine?.body ?? '')
  const [visibleToTable, setVisibleToTable] = useState(mine?.visible_to_table ?? false)
  const [confirming, setConfirming] = useState(false)
  const error = body.trim().length === 0 ? 'Напишите хотя бы пару слов.' : body.length > MAX_LENGTH ? `Не длиннее ${MAX_LENGTH} символов.` : ''

  const submit = (event) => {
    event.preventDefault()
    if (error || write.isPending) return
    write.mutate({ body: body.trim(), ...(withTableToggle ? { visible_to_table: visibleToTable } : {}) }, { onSuccess: () => setEditing(false) })
  }

  if (mine && !editing) return (
    <div className="campaign-review campaign-review--mine">
      <p className="text-label">Ваш отзыв{withTableToggle && ` · ${mine.visible_to_table ? 'виден всему столу' : 'видит только ГМ'}`}</p>
      <p className="text-body whitespace-pre-line">{mine.body}</p>
      <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => { setBody(mine.body); setVisibleToTable(mine.visible_to_table ?? false); setEditing(true) }}><LoreIcon name="edit" />Изменить</Button><Button size="sm" variant="danger" onClick={() => setConfirming(true)}><LoreIcon name="trash" />Удалить</Button></div>
      {confirming && <ConfirmDialog title="Удалить отзыв?" message="Отзыв исчезнет из кампании и со страницы её публичной кампании." busy={remove.isPending} error={remove.error && toCampaignError(remove.error)} onCancel={() => { setConfirming(false); remove.reset() }} onConfirm={() => remove.mutate(undefined, { onSuccess: () => { setConfirming(false); setBody(''); setEditing(true) } })} />}
    </div>
  )

  return (
    <form className="campaign-review campaign-review--form" onSubmit={submit} aria-label={label}>
      <TextArea value={body} rows={4} maxLength={MAX_LENGTH} aria-label={label} aria-invalid={Boolean(body) && Boolean(error)} aria-describedby="review-hint" placeholder="Что запомнилось, что понравилось…" onChange={(event) => setBody(event.target.value)} />
      <p id="review-hint" className="text-hint">{body && error ? error : `До ${MAX_LENGTH} символов.`}</p>
      {withTableToggle && <button type="button" className="lore-player-switch" role="switch" aria-checked={visibleToTable} onClick={() => setVisibleToTable((value) => !value)}>Видно всему столу <span className="lore-switch-track" aria-hidden="true" /></button>}
      {write.error && <ErrorBox error={toCampaignError(write.error)} onRetry={() => write.reset()} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={Boolean(error) || write.isPending}>{write.isPending ? 'Сохраняем…' : mine ? 'Сохранить отзыв' : 'Оставить отзыв'}</Button>
        {mine && <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>}
      </div>
    </form>
  )
}
