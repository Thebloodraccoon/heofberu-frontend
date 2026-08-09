/* eslint-disable react-refresh/only-export-components */

export function Spinner({ label = 'Загрузка...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
      <div className="size-8 animate-spin rounded-full border-2 border-ember border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-300">
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
  return <p className="py-8 text-center text-sm text-stone-500">{text}</p>
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</span>
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full resize-y rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none focus:border-ember"
    />
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-ember text-white hover:bg-ember-dark',
    ghost: 'border border-stone-600 text-stone-200 hover:bg-stone-800',
    danger: 'border border-red-800 text-red-300 hover:bg-red-950/50',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  )
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-stone-700/60 text-stone-200',
    accent: 'bg-ember/15 text-orange-200',
    good: 'bg-emerald-900/50 text-emerald-300',
    bad: 'bg-red-900/50 text-red-300',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
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
        <h1 className="font-display text-2xl font-bold text-stone-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}
        <div className={`ornate-rule mt-3 ${centered ? 'mx-auto max-w-md' : ''}`}>
          <span aria-hidden className="text-xs">✦</span>
        </div>
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

export function humanize(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
