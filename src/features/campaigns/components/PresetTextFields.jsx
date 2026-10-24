import { useId } from 'react'
import { Field, Input, RichTextEditor, TextArea } from '@/components/ui'
import { SECRET_TOOL } from './secretTool.jsx'

export const PITCH_MAX = 500

// Одинаковые поля и ограничения при создании и правке публичной кампании.
export default function PresetTextFields({ value, onChange, disabled = false }) {
  const hint = useId()
  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value })
  return (
    <div className="space-y-5">
      <Field label="Название"><Input value={value.title} disabled={disabled} maxLength={200} onChange={set('title')} aria-label="Название кампании" aria-invalid={!value.title.trim()} placeholder="Например, «Проклятие маяка»" /></Field>
      <div className="space-y-1.5">
        <Field label="Зазывалка"><TextArea value={value.pitch} disabled={disabled} rows={3} maxLength={PITCH_MAX} onChange={set('pitch')} aria-label="Зазывалка" aria-describedby={hint} placeholder="Пара фраз, ради которых захочется сыграть…" /></Field>
        <p id={hint} className="text-hint">{value.pitch.length}/{PITCH_MAX}. Видна всем в каталоге.</p>
      </div>
      <div className="space-y-1.5">
        <span className="article-editor-label">Описание</span>
        <RichTextEditor value={value.description_markdown} disabled={disabled} onChange={set('description_markdown')} extraTools={[SECRET_TOOL]} rows={14} ariaLabel="Описание публичной кампании" placeholder="Сюжет, тон, что ждёт игроков…" />
        <p className="text-hint">Блоки «Секрет мастера» видят только ГМ. Остальное описание доступно игрокам после публикации.</p>
      </div>
    </div>
  )
}
