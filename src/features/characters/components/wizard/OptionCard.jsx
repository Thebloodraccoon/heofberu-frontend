export function OptionCard({ selected, disabled, onClick, title, subtitle, children, className = '' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex h-full w-full items-center rounded-lg border px-3 py-5 text-left transition ${
        selected
          ? 'border-ember/80 bg-ember/10 shadow-[0_0_0_1px_rgba(212,85,42,0.35)]'
          : 'border-stone-700/70 bg-stone-800/40 hover:border-ember/50 hover:bg-stone-800/70'
      } ${disabled ? 'cursor-not-allowed opacity-45 hover:border-stone-700/70 hover:bg-stone-800/40' : ''} ${className}`}
    >
      <span
        className={`absolute right-2.5 flex size-4 items-center justify-center rounded-full border text-[10px] ${
          selected ? 'border-ember bg-ember text-white' : 'border-stone-600 text-transparent'
        }`}
        aria-hidden
      >
        ✓
      </span>
      <span className="pr-6">
        {title && <span className="block font-display text-base font-semibold text-stone-100">{title}</span>}
        {subtitle && <span className="mt-0.5 block text-xs text-stone-400">{subtitle}</span>}
        {children}
      </span>
    </button>
  )
}
