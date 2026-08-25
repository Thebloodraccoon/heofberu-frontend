import { useState } from 'react'
import { fmtBonus } from '@/lib/utils/sheet.js'

export function RollButton({ bonus, onClick, disabled, compact = false, className = '', title, label }) {
  return (
    <button
      type="button"
      className={`sheet-roll ${compact ? 'sheet-roll_compact' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {label ?? fmtBonus(bonus)}
    </button>
  )
}

export function CheckDot({ checked = false, expertise = false, onChange, id, name, disabled }) {
  const cls = expertise && checked ? 'sheet-checkdot sheet-checkdot_expertise' : 'sheet-checkdot'
  return (
    <label
      className={cls}
      title={checked ? (expertise ? 'Экспертность (владение ×2)' : 'Владение есть') : 'Нет владения'}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="sheet-checkdot__marker" />
    </label>
  )
}

export function BoxedValue({ children, label, boxClassName = '' }) {
  return (
    <div className="sheet-boxed">
      <div className={`sheet-boxed__box ${boxClassName}`}>{children}</div>
      {label && <span className="sheet-boxed__label">{label}</span>}
    </div>
  )
}

export function XpBar({ level = 1, current = 0, next = 300, fill = null }) {
  const pct = fill ?? Math.min(100, next > 0 ? (current / next) * 100 : 0)
  return (
    <div className="sheet-xp">
      <span className="sheet-xp__level" data-label="уровень">
        {level}
      </span>
      <div className="sheet-xp__track">
        <div className="sheet-xp__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="sheet-xp__level">{Math.min(20, level + 1)}</span>
    </div>
  )
}

export function SheetSectionLabel({ children, className = '' }) {
  return <p className={`sheet-section-label ${className}`.trim()}>{children}</p>
}

const ChevronIcon = ({ className = '' }) => (
  <svg className={className} height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
    <path d="M0 0h24v24H0z" fill="none" />
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
)

const PencilIcon = () => (
  <svg enableBackground="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
    <rect fill="none" height="24" width="24" />
    <path d="M3,10h11v2H3V10z M3,8h11V6H3V8z M3,16h7v-2H3V16z M18.01,12.87l0.71-0.71c0.39-0.39,1.02-0.39,1.41,0l0.71,0.71 c0.39,0.39,0.39,1.02,0,1.41l-0.71,0.71L18.01,12.87z M17.3,13.58l-5.3,5.3V21h2.12l5.3-5.3L17.3,13.58z" />
  </svg>
)

export function EditableBlock({ title, value = '', onSave, rows = 4 }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)

  const startEdit = () => {
    setDraft(value ?? '')
    setEdit(true)
  }

  const cancel = () => {
    setDraft(value)
    setEdit(false)
  }

  const save = async () => {
    await onSave?.(draft)
    setEdit(false)
  }

  return (
    <div className="sheet-text-block">
      <div className="sheet-text-block__head">
        <span className="sheet-section-label !mt-0">{title}</span>
        {!edit && (
          <button type="button" className="sheet-edit-note text-stone-300 hover:text-ember" title="Изменить" onClick={startEdit}>
            <PencilIcon />
          </button>
        )}
      </div>
      {edit ? (
        <div className="px-4 py-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={rows}
            className="w-full resize-y rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="button" className="sheet-btn sheet-btn_primary" onClick={save}>Сохранить</button>
            <button type="button" className="sheet-btn" onClick={cancel}>Отмена</button>
          </div>
        </div>
      ) : (
        <p className="mx-1 mb-1 whitespace-pre-wrap rounded-lg bg-stone-900/60 px-4 py-3 text-sm text-stone-300">
          {value || '—'}
        </p>
      )}
    </div>
  )
}

export function TextBlock({ title, value = '', editing = false, onSave, hint }) {
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)

  const startEdit = () => {
    setDraft(value)
    setEdit(true)
    setOpen(true)
    setSaved(false)
  }

  const cancel = () => {
    setEdit(false)
    setDraft(value)
  }

  const save = async () => {
    await onSave?.(draft)
    setEdit(false)
    setSaved(true)
  }

  return (
    <div className="sheet-text-block">
      <div className="sheet-text-block__head">
        <button type="button" className="sheet-text-block__label" onClick={() => setOpen(!open)}>
          {title}
          <ChevronIcon className={open ? 'rotate-90' : ''} />
        </button>
        {editing && onSave && !edit && (
          <button type="button" className="sheet-edit-note" title="Изменить" onClick={startEdit}>
            <PencilIcon />
          </button>
        )}
      </div>
      {open && (
        <div className="sheet-text-block__body">
          {edit ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="w-full resize-y rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
              />
              <div className="mt-2 flex items-center gap-2">
                <button type="button" className="sheet-btn sheet-btn_primary" onClick={save}>
                  Сохранить
                </button>
                <button type="button" className="sheet-btn" onClick={cancel}>
                  Отмена
                </button>
              </div>
            </>
          ) : (
            <>
              <p>{value || '—'}</p>
              {saved && <p className="mt-1 text-xs text-emerald-400">Сохранено</p>}
            </>
          )}
        </div>
      )}
      {hint && !open && <p className="sr-only">{hint}</p>}
    </div>
  )
}

export function ProficiencyChips({ items = [], options = [], empty = '—' }) {
  if (options.length === 0) {
    return <span className="text-xs text-stone-500">{empty}</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = items.includes(o.value)
        return (
          <span key={o.value} className={`sheet-chip ${on ? 'sheet-chip_on' : ''}`}>
            <span className="sheet-chip__dot" />
            {o.label}
          </span>
        )
      })}
    </div>
  )
}

export function PassiveSenses({ items = [] }) {
  return (
    <div className="sheet-passive">
      {items.map((it) => (
        <div key={it.name} className="sheet-passive__item">
          <span className="sheet-passive__icon">{it.icon}</span>
          <span className="sheet-passive__name">{it.name}</span>
          <span className="sheet-passive__value">{it.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SheetTabs({ tabs, active, onSelect }) {
  return (
    <div className="sheet-tabs flex-wrap">
      {tabs.map(([key, labelText]) => (
        <button
          key={key}
          type="button"
          className={`sheet-tabs__btn ${active === key ? 'sheet-tabs__btn_active' : ''}`}
          onClick={() => onSelect(key)}
        >
          {labelText}
        </button>
      ))}
    </div>
  )
}

export function RollModal({ title = 'Проверка', bonus, d20, onClose }) {
  const total = d20 + Number(bonus ?? 0)
  const isNat20 = d20 === 20
  const isNat1 = d20 === 1
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-lg border border-stone-700 bg-stone-900 p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-wide text-stone-500">{title}</p>
        <p className="mt-4 flex items-center justify-center gap-2">
          <span
            className={`grid size-11 place-items-center rounded border text-lg font-bold ${
              isNat20
                ? 'border-emerald-600 text-emerald-300'
                : isNat1
                  ? 'border-red-700 text-red-300'
                  : 'border-stone-600 text-stone-100'
            }`}
          >
            {d20}
          </span>
          <span className="text-stone-500">+</span>
          <span className="grid size-11 place-items-center rounded border border-stone-600 text-lg font-bold text-stone-100">
            {Number(bonus ?? 0)}
          </span>
          <span className="text-stone-500">=</span>
          <span className="grid size-11 place-items-center rounded bg-ember text-lg font-bold text-white">
            {total}
          </span>
        </p>
        {isNat20 && <p className="mt-3 text-sm text-emerald-300">Критический успех!</p>}
        {isNat1 && <p className="mt-3 text-sm text-red-300">Критический провал.</p>}
        <button type="button" className="sheet-btn sheet-btn_primary mt-4" onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  )
}
