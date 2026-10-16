import { useState } from 'react'
import { Button, ErrorBox, Field, Input, RichTextEditor, TextArea } from '@/components/ui'
import TagInput from '@/features/articles/components/TagInput.jsx'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useSavePublicCampaign } from '@/features/campaigns/queries.js'
import { SECRET_TOOL } from './secretTool.jsx'

export const PITCH_MAX = 500

// Новая публичная кампания — как «Новая статья» в редакторе лора: одна форма, сохраняется черновиком.
// Дальше она правится по полям в редакторе; ссылка (slug) при переименовании не меняется.
export default function PresetCreateForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ title: '', pitch: '', description_markdown: '', tags: [] })
  const save = useSavePublicCampaign()
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const titleError = form.title.trim() ? '' : 'Укажите название.'
  const submit = (event) => {
    event.preventDefault()
    if (titleError || save.isPending) return
    save.mutate({ title: form.title.trim(), pitch: form.pitch.trim(), description_markdown: form.description_markdown, tag_ids: form.tags.map((tag) => tag.id) }, { onSuccess: (saved) => onSaved?.(saved) })
  }

  return (
    <section className="article-editor">
      <div className="article-editor-heading"><h2 className="min-w-0 font-display text-xl font-bold text-stone-100">Новая публичная кампания</h2></div>
      <form className="article-editor-main mt-6 space-y-5" onSubmit={submit} aria-label="Новая публичная кампания">
        <Field label="Название"><Input value={form.title} maxLength={200} onChange={set('title')} aria-invalid={Boolean(titleError)} placeholder="Например, «Проклятие маяка»" /></Field>
        <Field label="Зазывалка"><TextArea value={form.pitch} rows={3} maxLength={PITCH_MAX} onChange={set('pitch')} aria-describedby="preset-pitch-hint" placeholder="Пара фраз, ради которых захочется сыграть…" /></Field>
        <p id="preset-pitch-hint" className="text-hint">{form.pitch.length}/{PITCH_MAX}. Видна всем в каталоге.</p>
        <div className="space-y-1.5">
          <span className="text-label">Описание</span>
          <RichTextEditor value={form.description_markdown} onChange={set('description_markdown')} extraTools={[SECRET_TOOL]} rows={10} ariaLabel="Описание публичной кампании" placeholder="Сюжет, тон, что ждёт игроков…" />
          <p className="text-hint">Блоки «Секрет мастера» видят только ГМ.</p>
        </div>
        <TagInput value={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} />
        {save.error && <ErrorBox error={toCampaignError(save.error)} onRetry={() => save.reset()} />}
        <div className="article-editor-save flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={Boolean(titleError) || save.isPending}>{save.isPending ? 'Создаём…' : 'Создать черновик'}</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        </div>
      </form>
    </section>
  )
}
