/* eslint-disable react-refresh/only-export-components */

import { Children, isValidElement, useEffect, useMemo, useRef, useState } from 'react'

export function Spinner({ label = 'Загрузка...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
      <div className="size-8 animate-spin rounded-full border-2 border-ember border-t-transparent" />
      <p className="text-hint">{label}</p>
    </div>
  )
}

export function ErrorBox({ error, onRetry, className = '' }) {
  return (
    <div className={`rounded-lg border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-300 ${className}`}>
      <p className="font-semibold">Произошла ошибка</p>
      <p className="mt-1">{error?.message || String(error)}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded bg-red-900/60 px-3 py-1.5 text-red-100 hover:bg-red-900"
        >
          Повторить
        </button>
      )}
    </div>
  )
}

export function EmptyState({ text }) {
  return <p className="py-8 text-center text-muted">{text}</p>
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-label">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className="input-base"
    />
  )
}

export function TextArea({ value, onChange, rows, ...props }) {
  const ref = useRef(null)

  // Высота подстраивается под содержимое сразу (и при вводе), тянуть не нужно.
  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = ''
    const minHeight = el.offsetHeight
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`
  }

  useEffect(() => {
    resize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={(e) => {
        resize()
        onChange?.(e)
      }}
      className="input-base"
      {...props}
    />
  )
}

export function Select({ value, onChange, children, className = '', disabled, placeholder, ...rest }) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const rootRef = useRef(null)

  const options = useMemo(() => {
    const out = []
    const push = (c) => {
      if (!isValidElement(c)) return
      if (c.type === 'option') {
        out.push({ value: c.props.value, label: c.props.children, disabled: !!c.props.disabled })
      } else {
        Children.forEach(c.props?.children, push)
      }
    }
    Children.forEach(children, push)
    return out
  }, [children])

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector(`[data-idx="${hi}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [hi, open])

  const choose = (o) => {
    onChange?.({ target: { value: o.value } })
    setOpen(false)
  }

  const step = (dir) => {
    if (!open) {
      setOpen(true)
      setHi(selectedIndex >= 0 ? selectedIndex : 0)
      return
    }
    let i = hi
    for (let k = 0; k < options.length; k++) {
      i = (i + dir + options.length) % options.length
      if (!options[i].disabled) break
    }
    setHi(i)
  }

  const handleKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      step(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setHi(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setHi(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && options[hi] && !options[hi].disabled) choose(options[hi])
      else if (!open) {
        setOpen(true)
        setHi(selectedIndex >= 0 ? selectedIndex : 0)
      }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...rest}
        className="flex w-full items-center justify-between gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none transition hover:border-stone-600 focus:border-ember disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${selected ? 'text-stone-100' : 'text-stone-500'}`}>
          {selected ? selected.label : placeholder ?? 'Выберите...'}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`size-4 shrink-0 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 7.5l4.5 4.5 4.5-4.5" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-stone-700 bg-stone-900 p-1 shadow-2xl"
        >
          {options.length === 0 && <p className="px-2.5 py-1.5 text-sm text-stone-500">Нет вариантов</p>}
          {options.map((o, i) => {
            const isSel = String(o.value) === String(value)
            return (
              <button
                key={String(o.value)}
                type="button"
                role="option"
                aria-selected={isSel}
                data-idx={i}
                disabled={o.disabled}
                onClick={() => choose(o)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-sm transition ${
                  i === hi || isSel
                    ? 'bg-stone-800 text-ember'
                    : 'text-stone-200 hover:bg-stone-800/60 hover:text-stone-100'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="truncate">{o.label}</span>
                {isSel && <span className="shrink-0 text-ember">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const styles = {
    primary: 'bg-ember text-white hover:bg-ember-dark',
    ghost: 'border border-stone-600 text-stone-200 hover:bg-stone-800',
    danger: 'border border-red-800 text-red-300 hover:bg-red-950/50',
  }
  const sizes = {
    xs: 'px-2 py-0.5 text-[11px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${sizes[size]} ${className}`}
    />
  )
}

export function Badge({ children, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-stone-700/60 text-stone-200',
    accent: 'bg-ember/15 text-orange-200',
    good: 'bg-emerald-900/50 text-emerald-300',
    bad: 'bg-red-900/50 text-red-300',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, actions, centered = false }) {
  return (
    <div
      className={`mb-8 flex flex-wrap items-center gap-4 ${
        centered ? 'flex-col items-center text-center' : 'justify-between'
      }`}
    >
      <div className={centered ? 'w-full' : 'min-w-0 flex-1'}>
        <h1 className="heading-page">{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ className = '', children }) {
  return (
    <div className={`fantasy-panel rounded-lg ${className}`}>
      {children}
    </div>
  )
}

export function Chip({ children, className = '' }) {
  return (
    <span className={`badge-row ${className}`}>
      {children}
    </span>
  )
}

export function PillToggle({ options, selected, onToggle, className = '' }) {
  return (
    <div className={`flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded border border-stone-700/60 bg-stone-900/50 p-3 ${className}`}>
      {options.map((o) => {
        const active = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              active ? 'bg-ember text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
  align = 'center',
  scroll = false,
  tone = 'default',
  className = '',
}) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', '2xl': 'max-w-2xl', '4xl': 'max-w-4xl' }
  const maxW = sizes[size] ?? sizes.md
  const overlay =
    align === 'top'
      ? 'fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4'
      : 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
  const panelBase = `w-full rounded-lg bg-stone-900 shadow-2xl ${
    tone === 'danger' ? 'ring-1 ring-red-900/60' : 'ring-1 ring-stone-700'
  }`
  const panel = scroll
    ? `flex max-h-[88vh] flex-col ${maxW} ${panelBase}`
    : align === 'top'
      ? `mx-auto mt-8 ${maxW} ${panelBase} p-5`
      : `${maxW} ${panelBase} p-5`
  return (
    <div className={`${overlay} ${className}`} onClick={onClose}>
      <div className={panel} onClick={(e) => e.stopPropagation()}>
        {(title || onClose) && (
          <div
            className={
              scroll
                ? 'flex items-start justify-between gap-3 border-b border-stone-700/70 px-5 py-4'
                : 'mb-4 flex items-start justify-between gap-3'
            }
          >
            <div>
              {title && <h2 className="heading-section">{title}</h2>}
              {subtitle && <p className="subtitle">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className={scroll ? 'flex-1 space-y-3 overflow-y-auto p-5' : ''}>{children}</div>
        {footer && (
          <div
            className={
              scroll
                ? 'flex items-center justify-end gap-2 border-t border-stone-700/70 px-5 py-4'
                : 'mt-4 flex items-center justify-end gap-2'
            }
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  error,
  busy = false,
  cancelText = 'Отмена',
  confirmText = 'Да, удалить',
  busyText = 'Удаляем...',
  onCancel,
  onConfirm,
}) {
  return (
    <Modal title={title} onClose={busy ? undefined : onCancel} tone="danger">
      <p className="text-body">{message}</p>
      {error && (
        <div className="mt-3">
          <ErrorBox error={error} onRetry={() => {}} />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          {cancelText}
        </Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>
          {busy ? busyText : confirmText}
        </Button>
      </div>
    </Modal>
  )
}

export function StatTable({ rows }) {
  if (!rows || rows.length === 0) return null
  return (
    <table className="sheet-table">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th>{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function FactList({ children }) {
  return <ul className="mb-6 space-y-1.5">{children}</ul>
}

export function FactRow({ label: lbl, value }) {
  return (
    <li className="text-body">
      <span className="font-medium text-stone-200">{lbl}: </span>
      <span>{value}</span>
    </li>
  )
}

export function humanize(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
