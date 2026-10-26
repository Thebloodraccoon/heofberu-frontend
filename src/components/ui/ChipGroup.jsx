import useRovingRadio from './useRovingRadio.js'

// Выбор одного варианта чипами (до ~6–10 коротких вариантов): весь список виден, клик или
// стрелки — выбор, одна остановка Tab. options — [{ value, label }]; value '' показывается
// как emptyLabel («Нет», «Любой»…).
export default function ChipGroup({ label, options, value, onChange, emptyLabel = 'Нет', className = '' }) {
  const radio = useRovingRadio(options.map((o) => o.value), value ?? '', onChange)
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <button key={o.value} type="button" className="catalog-filter-choice" {...radio(o.value)}>
          {o.value === '' ? emptyLabel : o.label}
        </button>
      ))}
    </div>
  )
}
