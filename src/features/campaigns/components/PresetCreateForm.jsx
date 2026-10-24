import { useEffect, useRef, useState } from 'react'
import { Button, ErrorBox } from '@/components/ui'
import TagInput from '@/features/articles/components/TagInput.jsx'
import UnsavedGuard from '@/features/articles/components/UnsavedGuard.jsx'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useSavePublicCampaign } from '@/features/campaigns/queries.js'
import CampaignEditorNav from './CampaignEditorNav.jsx'
import PresetTextFields from './PresetTextFields.jsx'

// Новая публичная кампания — как «Новая статья» в редакторе лора: одна форма, сохраняется черновиком.
// После создания текст сохраняется одной кнопкой; теги — сразу.
export default function PresetCreateForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ title: '', pitch: '', description_markdown: '', tags: [] })
  const save = useSavePublicCampaign()
  const [created, setCreated] = useState(null)
  const notified = useRef(false)
  useEffect(() => {
    if (!created || notified.current) return
    notified.current = true
    onSaved?.(created)
  }, [created, onSaved])
  const dirty = Boolean(form.title || form.pitch || form.description_markdown || form.tags.length)
  const titleError = form.title.trim() ? '' : 'Укажите название.'
  const submit = (event) => {
    event.preventDefault()
    if (titleError || save.isPending || created) return
    save.mutate({ title: form.title.trim(), pitch: form.pitch.trim(), description_markdown: form.description_markdown, tag_ids: form.tags.map((tag) => tag.id) }, { onSuccess: setCreated })
  }

  return (
    <section className="article-editor preset-editor">
      <UnsavedGuard when={dirty && !created} />
      <div className="article-editor-heading"><h2 className="min-w-0 font-display text-xl font-bold text-stone-100">Новая публичная кампания</h2></div>
      <CampaignEditorNav />
      <p className="text-hint">Все поля и теги сохранятся вместе в черновик. Затем можно будет добавить материалы базы знаний и опубликовать кампанию.</p>
      <form className="article-editor-main mt-6 space-y-5" onSubmit={submit} aria-label="Новая публичная кампания">
        <PresetTextFields value={form} onChange={setForm} disabled={save.isPending || Boolean(created)} />
        <fieldset disabled={save.isPending || Boolean(created)}><TagInput value={form.tags} onChange={(tags) => setForm((current) => ({ ...current, tags }))} /></fieldset>
        {save.error && <ErrorBox error={toCampaignError(save.error)} onRetry={() => save.reset()} />}
        <div className="article-editor-save flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={Boolean(titleError) || save.isPending || Boolean(created)}>{save.isPending || created ? 'Создаём…' : 'Создать черновик'}</Button>
          <Button type="button" variant="ghost" disabled={save.isPending || Boolean(created)} onClick={onCancel}>Отмена</Button>
        </div>
      </form>
    </section>
  )
}
