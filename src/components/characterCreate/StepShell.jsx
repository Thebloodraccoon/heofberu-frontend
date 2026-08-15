export function StepShell({ stepNo, total, title, subtitle, children }) {
  return (
    <div>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-ember">
          Шаг {stepNo} из {total}
        </span>
      </div>
      <h2 className="font-display text-xl font-bold text-stone-100">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-stone-400">{subtitle}</p>}
      <div className="ornate-rule mb-5 mt-3 max-w-md">
        <span aria-hidden className="text-xs">
          ✦
        </span>
      </div>
      {children}
    </div>
  )
}

export function Hint({ children, className = '' }) {
  return <p className={`text-xs text-stone-500 ${className}`}>{children}</p>
}

export function Panel({ title, children, className = '' }) {
  return (
    <div className={`rounded-lg border border-stone-700/60 bg-stone-800/30 p-4 ${className}`}>
      {title && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">{title}</p>}
      {children}
    </div>
  )
}

export function Tag({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-stone-700/60 text-stone-200',
    accent: 'bg-ember/15 text-orange-200',
    good: 'bg-emerald-900/50 text-emerald-300',
    dim: 'bg-stone-800 text-stone-500',
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
