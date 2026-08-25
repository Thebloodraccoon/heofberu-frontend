export function StepShell({ stepNo, total, title, subtitle, children }) {
  return (
    <div>
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-ember">
          Шаг {stepNo} из {total}
        </span>
      </div>
      <h2 className="font-display text-2xl font-bold text-stone-100">{title}</h2>
      {subtitle && <p className="mt-1.5 text-[15px] text-stone-300">{subtitle}</p>}
      <div className="ornate-rule mb-6 mt-3 max-w-md">
        <span aria-hidden className="text-xs">
          ✦
        </span>
      </div>
      <div className="space-y-8">{children}</div>
    </div>
  )
}

export function Hint({ children, className = '' }) {
  return <p className={`text-sm text-stone-400 ${className}`}>{children}</p>
}

export function Section({ title, children, className = '' }) {
  return (
    <section className={className}>
      {title && (
        <h3 className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-gold-light">
          <span className="shrink-0">{title}</span>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
        </h3>
      )}
      <div>{children}</div>
    </section>
  )
}

export const Panel = Section

export function Feature({ name, description, extra }) {
  return (
    <div className="rounded-lg border-l-2 border-gold/40 bg-stone-900/40 px-3.5 py-2.5">
      <p className="flex items-baseline gap-2 text-[15px] font-medium text-stone-100">
        {name}
        {extra && <span className="text-sm font-normal text-stone-500">{extra}</span>}
      </p>
      {description && <p className="mt-0.5 text-sm leading-relaxed text-stone-300">{description}</p>}
    </div>
  )
}

export function Search({ value, onChange, placeholder = 'Поиск…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-stone-700 bg-stone-800/70 py-2 pl-8 pr-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember"
      />
    </div>
  )
}

export function Tag({ children, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-stone-700/60 text-stone-200',
    accent: 'bg-ember/15 text-orange-200',
    good: 'bg-emerald-900/50 text-emerald-300',
    dim: 'bg-stone-800 text-stone-500',
    bad: 'bg-red-950/60 text-red-300',
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
