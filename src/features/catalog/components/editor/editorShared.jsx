import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import LevelField, { NumberStepper } from './LevelField.jsx'
import DamageTypeField from '@/components/ui/DamageTypeField.jsx'
import ChipGroup from '@/components/ui/ChipGroup.jsx'
import { useEffect, useRef, useState } from 'react'
import { Input, RichTextEditor, RichTextField, Select, TextField } from '@/components/ui'

export function PencilIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function TrashIcon({ className = '' }) {
  return <LoreIcon name="trash" className={className} />
}

// Числовое поле с коммитом по потере фокуса (или Enter): пока GM вводит
// многозначное число (например «15»), значение копится только в локальном
// черновике и в форму не уходит — иначе общий автосейв успел бы сохранить «1»
// ещё до ввода «5». Внешние изменения формы (открытие другой записи, ответ
// автосейва) подтягиваются, только когда поле не в фокусе, чтобы не затирать
// черновик во время ввода.
export function BlurNumberInput({ value, onChange, min, max, placeholder, className = '', ...rest }) {
  const [draft, setDraft] = useState(() => String(value ?? ''))
  const draftRef = useRef(draft)
  const focusedRef = useRef(false)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!focusedRef.current) setDraft(String(value ?? ''))
  }, [value])

  return (
    <input
      type="number"
      min={min}
      max={max}
      placeholder={placeholder}
      className={className}
      value={draft}
      onFocus={() => {
        focusedRef.current = true
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focusedRef.current = false
        const next = draftRef.current
        if (next !== String(value ?? '')) onChange?.(next)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      {...rest}
    />
  )
}

export function SectionTitle({ children, button }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <p className="catalog-editor-section-title text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{children}</p>
      <span className="h-px flex-1 bg-stone-700/70" aria-hidden="true" />
      {button}
    </div>
  )
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Аккордеон-строка уже добавленной группы (эффектов особенности, снаряжения
// на выбор и т.п.): заголовок с названием/счётчиком и Изменить/Удалить всегда
// виден, по клику раскрывается read-only содержимое. Сама правка — только
// через отдельную модалку конкретной группы.
// «Выбирает: − 2 + из 5» — сколько вариантов из списка берёт игрок (навыки класса).
export function ChoiceCountStepper({ value, max, onChange }) {
  const over = value > max
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${over ? 'text-red-300' : 'text-stone-400'}`} title={over ? 'Больше, чем вариантов в списке' : undefined}>
      Выбирает:
      <button type="button" className="character-dice-step !size-8" aria-label="Выбирает меньше" disabled={value <= 0} onClick={() => onChange(value - 1)}><LoreIcon name="minus" /></button>
      <span className="min-w-4 text-center text-sm tabular-nums text-stone-100" aria-label="Сколько выбирает игрок">{value}</span>
      <button type="button" className="character-dice-step !size-8" aria-label="Выбирает больше" disabled={value >= max} onClick={() => onChange(value + 1)}><LoreIcon name="plus" /></button>
      из {max}
    </span>
  )
}

export function GroupRow({ title, count, open, onToggle, onEdit, onRemove, children }) {
  return (
    // Раскрытие видно по стрелке — рамка одна в любом состоянии.
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <div className="flex items-center justify-between gap-2 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Chevron open={open} />
          <span className="min-w-0 truncate text-sm font-medium text-stone-100">
            {title}
            {count != null && <span className="ml-1.5 text-xs font-normal text-stone-500">· {count}</span>}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="my-[5px] inline-flex h-[36px] w-[36px] items-center justify-center rounded border border-stone-700 text-stone-300 transition hover:bg-stone-800"
            title="Изменить"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="catalog-delete-button"
            title="Удалить"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      {open && <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-300">{children}</div>}
    </div>
  )
}

export default function EditorFieldControl({ field, value, onChange, onSaveField }) {
  if (field.type === 'textarea') {
    // При редактировании существующей записи текстовые поля сохраняются сами
    // по себе (без общей кнопки формы) — так правки не теряются, если GM
    // передумает менять остальные поля, и видно, какое поле уже сохранено.
    if (onSaveField) {
      return <RichTextField label={field.label} value={value} onSave={onSaveField} rows={field.rows ?? 4} placeholder={field.placeholder} />
    }
    return (
      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
      />
    )
  }
  // Маленький диапазон (КД, уровень, бонус) — «[−] N [+]»; level — 1–20, пусто = «Сразу».
  if (field.type === 'stepper' || field.type === 'level') {
    const Control = field.type === 'level' ? LevelField : NumberStepper
    return (
      <Control
        hideLabel
        label={field.label}
        min={field.min}
        max={field.max}
        suffix={field.suffix}
        emptyText={field.emptyText}
        required={field.required}
        value={value === '' || value == null ? null : Number(value)}
        onChange={(n) => onChange(n == null ? '' : String(n))}
      />
    )
  }
  if (field.type === 'number') {
    // unit — единица прямо в поле (фт., зм, фунт.), без стрелок: для больших чисел они бесполезны.
    if (field.unit) {
      return (
        <span className="unit-input">
          <BlurNumberInput min={field.min} max={field.max} value={value} onChange={onChange} inputMode="numeric" className="input-base input-no-steppers" />
          <span className="unit-input-suffix">{field.unit}</span>
        </span>
      )
    }
    return <BlurNumberInput min={field.min} max={field.max} value={value} onChange={onChange} className="input-base" />
  }
  // Чипы — короткий список (до ~6 вариантов) виден целиком, выбор в один клик.
  if (field.type === 'chips') {
    return <ChipGroup label={field.label} options={field.options} value={value} onChange={onChange} emptyLabel={field.emptyLabel} />
  }
  if (field.type === 'damageType') {
    return <DamageTypeField label={field.label} value={value ?? ''} onChange={onChange} />
  }
  if (field.type === 'select') {
    return (
      <Select value={value} onChange={onChange}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    )
  }
  // Однострочный текст при редактировании сохраняется сам по себе (как
  // textarea выше) — без общей кнопки формы, тем же путём через onSaveField.
  if (onSaveField) {
    return <TextField label={field.label} value={value} onSave={onSaveField} placeholder={field.placeholder} />
  }
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      required={field.required}
    />
  )
}
