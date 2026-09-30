import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

export default function CatalogFilterSummary({ definitions, value, onChange }) {
  const selections = definitions.flatMap((filter) =>
    (value[filter.name] ?? []).map((selected) => ({
      name: filter.name,
      value: selected,
      label: `${filter.label}: ${filter.options.find((option) => option.value === selected)?.label ?? selected}`,
    })),
  )
  if (!selections.length) return null

  const remove = (selection) => {
    const next = { ...value }
    const remaining = next[selection.name].filter((item) => item !== selection.value)
    if (remaining.length) next[selection.name] = remaining
    else delete next[selection.name]
    onChange(next)
  }

  return (
    <div className="catalog-filter-summary" aria-label="Применённые фильтры">
      {selections.map((selection) => (
        <button
          key={`${selection.name}-${selection.value}`}
          type="button"
          onClick={() => remove(selection)}
          aria-label={`Убрать фильтр ${selection.label}`}
          className="catalog-filter-chip"
        >
          {selection.label} <LoreIcon name="close" />
        </button>
      ))}
      <button type="button" className="catalog-filter-clear" onClick={() => onChange({})}>Сбросить все</button>
    </div>
  )
}
