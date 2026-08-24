import { Modal, PillToggle } from '@/components/ui'

export default function FilterModal({ filters, value, onChange, onClose }) {
  const toggle = (name, v) => {
    const cur = value[name] ?? []
    const next = { ...value }
    if (cur.includes(v)) {
      const rest = cur.filter((x) => x !== v)
      if (rest.length === 0) delete next[name]
      else next[name] = rest
    } else {
      next[name] = [...cur, v]
    }
    onChange(next)
  }

  return (
    <Modal title="Фильтр" onClose={onClose} size="md" align="top">
      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        {filters.length === 0 && <p className="text-sm text-stone-500">Фильтров нет</p>}
        {filters.map((f) => (
          <section key={f.name}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {f.label}
            </h3>
            <PillToggle
              options={f.options}
              selected={value[f.name] ?? []}
              onToggle={(v) => toggle(f.name, v)}
              className="max-h-52 border-0 bg-transparent p-0"
            />
          </section>
        ))}
      </div>
      {Object.keys(value).length > 0 && (
        <button
          type="button"
          className="mt-4 w-full rounded border border-stone-700 py-1.5 text-xs text-stone-400 transition hover:bg-stone-800"
          onClick={() => onChange({})}
        >
          Сбросить все фильтры
        </button>
      )}
    </Modal>
  )
}
