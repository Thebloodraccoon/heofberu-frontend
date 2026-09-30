import { useState } from 'react'
import { Button } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'

export default function FilterModal({ filters, value, onChange, onClose }) {
  const [draft, setDraft] = useState(value)

  const toggle = (name, v) => {
    const cur = draft[name] ?? []
    const next = { ...draft }
    if (cur.includes(v)) {
      const rest = cur.filter((x) => x !== v)
      if (rest.length === 0) delete next[name]
      else next[name] = rest
    } else {
      next[name] = [...cur, v]
    }
    setDraft(next)
  }

  const applyAndClose = () => {
    onChange(draft)
    onClose()
  }

  const resetAndClose = () => {
    onChange({})
    onClose()
  }

  const activeCount = Object.values(draft).reduce((count, entries) => count + entries.length, 0)
  const appliedCount = Object.values(value).reduce((count, entries) => count + entries.length, 0)

  return (
    <Drawer title="Фильтры" subtitle={activeCount ? `Выбрано: ${activeCount}` : 'Выберите параметры поиска'} onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={resetAndClose} disabled={!activeCount && !appliedCount}>Сбросить</Button>
        <Button onClick={applyAndClose}>Применить</Button>
      </>
    }>
      <div className="space-y-6">
        {filters.length === 0 && <p className="text-sm text-stone-500">Фильтров нет</p>}
        {filters.map((filter) => (
          <fieldset key={filter.name}>
            <legend className="mb-3 text-lg text-stone-100">{filter.label}</legend>
            <div className="flex flex-wrap gap-2">
              {filter.options.map((option) => <button key={option.value} type="button" className="catalog-filter-choice" aria-pressed={(draft[filter.name] ?? []).includes(option.value)} onClick={() => toggle(filter.name, option.value)}>{option.label}</button>)}
            </div>
          </fieldset>
        ))}
      </div>
    </Drawer>
  )
}
