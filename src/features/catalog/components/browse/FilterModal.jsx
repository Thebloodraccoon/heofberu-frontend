import { fieldLabel, label, raceSizeLabels } from '@/lib/i18n/index.js'
import { Modal, PillToggle } from '@/components/ui'
import { spellLevel } from './detail/detailHelpers.jsx'

function filterLabel(field, value) {
  if (field === 'level') return spellLevel(value)
  if (field === 'size') return raceSizeLabels[value] ?? label(value)
  if (field === 'is_concentration' || field === 'is_ritual') return value === 'true' ? 'Да' : 'Нет'
  return label(value)
}

export default function FilterModal({ fields, options, value, onChange, onClose }) {
  const toggle = (field, v) => {
    const cur = value[field] ?? []
    onChange({ ...value, [field]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }

  return (
    <Modal title="Фильтр" onClose={onClose} size="md" align="top">
      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        {fields.length === 0 && <p className="text-sm text-stone-500">Фильтров нет</p>}
        {fields.map((field) => (
          <section key={field}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {fieldLabel(field)}
            </h3>
            <PillToggle
              options={(options[field] ?? []).map((v) => ({ value: v, label: filterLabel(field, v) }))}
              selected={value[field] ?? []}
              onToggle={(v) => toggle(field, v)}
              className="max-h-52 border-0 bg-transparent p-0"
            />
          </section>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-stone-500">Фильтры применяются автоматически!</p>
    </Modal>
  )
}
