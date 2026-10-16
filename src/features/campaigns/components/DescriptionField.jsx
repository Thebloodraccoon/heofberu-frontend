import { useState } from 'react'
import { Button, ErrorBox, RichTextEditor } from '@/components/ui'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { SECRET_TOOL } from './secretTool.jsx'

// Описание правится как текст статьи: «Изменить» → редактор с «Секретом мастера» → «Сохранить».
// Без onSave — только чтение.
export default function DescriptionField({ value, onSave, label = 'Описание', ariaLabel = label, placeholder = 'Сюжет, тон, что ждёт игроков…', empty = 'Описание пока не написано.', framed = true }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const save = async () => {
    setSaving(true)
    setError(null)
    try { await onSave(draft); setEdit(false) } catch (e) { setError(toCampaignError(e)) } finally { setSaving(false) }
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2"><span className="text-label">{label}</span>{onSave && !edit && <button type="button" className="btn-edit-inline" aria-label={`Изменить ${label.toLowerCase()}`} onClick={() => { setDraft(value); setEdit(true) }}>Изменить</button>}</div>
      {edit ? <>
        <RichTextEditor value={draft} disabled={saving} onChange={(event) => setDraft(event.target.value)} extraTools={[SECRET_TOOL]} rows={14} autoFocus ariaLabel={ariaLabel} placeholder={placeholder} />
        {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={saving} onClick={save}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => setEdit(false)}>Отмена</Button></div>
      </> : <div className={framed ? 'rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2' : ''}><ArticleText value={value} empty={empty} /></div>}
      {onSave && <p className="text-hint">Блоки «Секрет мастера» видят только ГМ.</p>}
    </div>
  )
}
