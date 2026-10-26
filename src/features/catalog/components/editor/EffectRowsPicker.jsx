import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useState } from 'react'
import { Input } from '@/components/ui'
import { catalogApi as api } from '@/features/catalog/api.js'
import CatalogSearchList from '@/features/catalog/components/CatalogSearchList.jsx'
import { useSkills } from '@/features/catalog/queries.js'
import { ITEM_FILTERS_BY_KIND } from './itemFilters.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { ITEM_PICKERS, ROW_PICKERS } from './effectRowPickers.js'
import { queryKeys } from '@/lib/api/queryKeys.js'

const SEARCH_THRESHOLD = 8
const ALWAYS = () => true

// Конкретный предмет из справочника (item_id) — отдельный экран владения
// оружием/доспехами/инструментами (mode 'items'): тот же поиск, фильтры вида и
// подгрузка по скроллу, что у ItemPickerModal; клик добавляет или убирает строку.
function ItemsList({ config, rows, onChange }) {
  const selected = new Set(rows.filter((row) => row.item_id != null).map((row) => Number(row.item_id)))
  const toggle = (item) => {
    if (selected.has(item.id)) {
      onChange(rows.filter((row) => Number(row.item_id) !== item.id))
      return
    }
    onChange([...rows, { [config.categoryKey]: null, item_id: item.id }])
  }

  return (
    <CatalogSearchList
      queryKey={queryKeys.pickers.items}
      list={api.items.list}
      params={{ kind: [config.kind] }}
      filters={ITEM_FILTERS_BY_KIND[config.kind]}
      placeholder={config.search}
      label={config.search}
    >
      {(found) => found.map((item) => {
        const isSelected = selected.has(item.id)
        return (
          <button
            key={item.id}
            type="button"
            className={`editor-record-card ${isSelected ? 'is-active' : ''}`}
            aria-pressed={isSelected}
            onClick={() => toggle(item)}
          >
            <span>{sentenceCase(item.name)}</span>
          </button>
        )
      })}
    </CatalogSearchList>
  )
}

// Экран выбора внутри панели эффектов — ровно тот же приём, что и у выбора
// заклинания (SpellPickerModal inline): никакого второго диалога поверх, а
// содержимое панели подменяется списком с поиском и мультивыбором.
// mode 'items' — у владения оружием/доспехами экран конкретного предмета вместо категорий.
export default function EffectRowsPicker({ effectType, rows = [], onChange, onClose, mode = null }) {
  const itemPicker = mode === 'items' || !ROW_PICKERS[effectType] ? ITEM_PICKERS[effectType] : null
  const picker = ROW_PICKERS[effectType] ?? {}
  const [query, setQuery] = useState('')
  const fromSkills = picker.source === 'skills'

  const skillsQ = useSkills({}, { enabled: fromSkills })

  const options = fromSkills
    ? (skillsQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))
    : Object.entries(picker.labels ?? {}).map(([value, label]) => ({ value, label }))

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

  if (itemPicker) {
    return (
      <section className="spell-picker-content">
        <button type="button" className="article-back" onClick={onClose}>
          <LoreIcon name="back" /> К эффектам
        </button>
        <h3 className="article-editor-label">{itemPicker.title}</h3>
        <ItemsList config={itemPicker} rows={rows} onChange={onChange} />
      </section>
    )
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
      {/* grant-picker-list — единственный прокручиваемый блок экрана выбора
          (.spell-picker-content во всю высоту панели и без своей прокрутки). */}
      <div className="grant-picker-list space-y-2 pr-1">
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
