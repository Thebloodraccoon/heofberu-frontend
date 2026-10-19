import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui'
import { catalogApi as api } from '@/features/catalog/api.js'
import { ROW_PICKERS } from './effectRowPickers.js'

const SEARCH_THRESHOLD = 8
const ALWAYS = () => true

// Экран выбора внутри панели эффектов — ровно тот же приём, что и у выбора
// заклинания (SpellPickerModal inline): никакого второго диалога поверх, а
// содержимое панели подменяется списком с поиском и мультивыбором.
export default function EffectRowsPicker({ effectType, rows = [], onChange, onClose }) {
  const picker = ROW_PICKERS[effectType]
  const [query, setQuery] = useState('')
  const fromSkills = picker.source === 'skills'

  const skillsQ = useQuery({
    queryKey: ['catalog', 'skills', 'all'],
    enabled: fromSkills,
    queryFn: () => api.skills.list({ size: 100 }),
  })

  const options = fromSkills
    ? (skillsQ.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))
    : Object.entries(picker.labels).map(([value, label]) => ({ value, label }))

  // Уже добавленные строки — это и есть «выбранное»: клик по варианту
  // добавляет строку эффекта или убирает её вместе со всеми настройками
  // (например, с отметкой «экспертиза» у навыка).
  const inPicker = picker.matches ?? ALWAYS
  const selected = new Set(rows.filter(inPicker).map((row) => row[picker.idKey]))
  const toggle = (value) => {
    if (!selected.has(value)) {
      onChange([...rows, picker.newRow(value)])
      return
    }
    if (picker.lockExisting) return
    onChange(rows.filter((row) => !(inPicker(row) && row[picker.idKey] === value)))
  }

  const q = query.trim().toLowerCase()
  const visible = q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options
  const allTaken = picker.lockExisting && options.length > 0 && options.every((o) => selected.has(o.value))

  return (
    <section className="spell-picker-content">
      <button type="button" className="article-back" onClick={onClose}>
        <LoreIcon name="back" /> К эффектам
      </button>
      <h3 className="article-editor-label">{picker.title}</h3>
      {options.length > SEARCH_THRESHOLD && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск…"
          aria-label={`Поиск: ${picker.title}`}
          className="mb-3 w-full"
        />
      )}
      {skillsQ.isFetching && <p className="pb-1 text-xs text-stone-500">Загрузка списка навыков…</p>}
      {allTaken && (
        <p className="pb-2 text-xs text-stone-500">Всё уже добавлено — повтор невозможен. Удалить можно в самой строке.</p>
      )}
      <div className="space-y-2">
        {visible.map((option) => {
          const isSelected = selected.has(option.value)
          const locked = isSelected && picker.lockExisting
          return (
            <button
              key={option.value}
              type="button"
              disabled={locked}
              className={`editor-record-card ${isSelected ? 'is-active' : ''} ${locked ? 'opacity-40' : ''}`}
              aria-pressed={locked ? undefined : isSelected}
              onClick={() => toggle(option.value)}
            >
              <span>{option.label}</span>
              {locked && <span className="ml-2 text-xs text-stone-500">добавлено</span>}
            </button>
          )
        })}
      </div>
      {visible.length === 0 && !skillsQ.isFetching && (
        <p className="text-sm text-stone-500">Ничего не найдено</p>
      )}
    </section>
  )
}
