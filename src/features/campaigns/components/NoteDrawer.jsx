import { useState } from 'react'
import { Button, ConfirmDialog, ErrorBox, Field, Input, RichTextEditor } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useDeleteNote, useSaveNote } from '@/features/campaigns/queries.js'

// Личная заметка ГМ: сюжетные линии, НПС, подготовка. Игроки заметок не видят вовсе.
export default function NoteDrawer({ campaign, note, onClose }) {
  const editing = Boolean(note)
  const { push } = useToasts()
  const [form, setForm] = useState({ title: note?.title ?? '', body_markdown: note?.body_markdown ?? '' })
  const [confirming, setConfirming] = useState(false)
  const save = useSaveNote(campaign.id)
  const remove = useDeleteNote(campaign.id)
  const titleError = form.title.trim() ? '' : 'Дайте заметке название.'
  const submit = (event) => {
    event.preventDefault()
    if (titleError || save.isPending) return
    save.mutate({ ...(editing ? { noteId: note.id } : {}), title: form.title.trim(), body_markdown: form.body_markdown }, { onSuccess: () => { push(editing ? 'Заметка сохранена' : 'Заметка добавлена', undefined, 'success'); onClose() } })
  }

  return (
    <Drawer title={editing ? 'Заметка' : 'Новая заметка'} subtitle="Видна только вам." onClose={confirming ? () => {} : onClose} closeLabel="Закрыть заметку" footer={
      <div className="article-filter-actions">
        {editing ? <Button variant="danger" onClick={() => setConfirming(true)}><LoreIcon name="trash" />Удалить</Button> : <Button variant="ghost" onClick={onClose}>Отмена</Button>}
        <Button type="submit" form="note-form" disabled={Boolean(titleError) || save.isPending}>{save.isPending ? 'Сохраняем…' : 'Сохранить'}</Button>
      </div>
    }>
      <form id="note-form" className="space-y-4" onSubmit={submit}>
        <Field label="Название"><Input value={form.title} maxLength={200} aria-invalid={Boolean(titleError)} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Например, «Культ под мэрией»" /></Field>
        <div className="space-y-1.5">
          <span className="text-label">Текст</span>
          <RichTextEditor value={form.body_markdown} onChange={(event) => setForm((current) => ({ ...current, body_markdown: event.target.value }))} rows={12} ariaLabel="Текст заметки" placeholder="Сюжетные линии, НПС, заготовки…" />
        </div>
        {save.error && <ErrorBox error={toCampaignError(save.error)} onRetry={() => save.reset()} />}
      </form>
      {confirming && <ConfirmDialog title="Удалить заметку?" message={`Заметка «${note.title}» исчезнет без возможности восстановления.`} busy={remove.isPending} error={remove.error && toCampaignError(remove.error)} onCancel={() => { setConfirming(false); remove.reset() }} onConfirm={() => remove.mutate(note.id, { onSuccess: () => { push('Заметка удалена', undefined, 'success'); onClose() } })} />}
    </Drawer>
  )
}
