import { useId, useRef, useState } from 'react'
import { RichText } from '@/components/ui'
import { useWeaponProperties } from '@/features/catalog/queries.js'

// Одно свойство оружия: чип, описание — подсказкой по наведению, фокусу или
// тапу (повторный тап, Esc, уход фокуса закрывают). Описание из словаря — Markdown через RichText.
function PropertyChip({ name, description }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  // Состояние на момент касания: эмулированные hover+focus успевают открыть
  // подсказку до click, поэтому тап переключает от того, что было до него.
  const touchRef = useRef(null)
  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="rounded bg-stone-800 px-2 py-0.5 text-xs font-medium text-stone-200 underline decoration-stone-500 decoration-dotted underline-offset-2 transition hover:bg-stone-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-ember"
        aria-describedby={open && description ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onPointerDown={(e) => { touchRef.current = e.pointerType === 'touch' ? { wasOpen: open } : null }}
        onClick={() => {
          const touch = touchRef.current
          touchRef.current = null
          setOpen(touch ? !touch.wasOpen : true)
        }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      >
        {name}
      </button>
      {open && description && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1 block w-72 max-w-[80vw] rounded border border-stone-700 bg-stone-900 p-2 text-left text-xs font-normal text-stone-300 shadow-lg"
        >
          <RichText value={description} />
        </span>
      )}
    </span>
  )
}

// Свойства оружия ([{id, name}] из ответа предмета) — по чипу на свойство,
// описания берутся из словаря GET /items/properties (кеш useWeaponProperties) по id.
export default function WeaponPropertyChips({ properties = [] }) {
  const { data: dictionary = [] } = useWeaponProperties({ enabled: properties.length > 0 })
  const byId = new Map(dictionary.map((p) => [p.id, p]))
  if (properties.length === 0) return null
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {properties.map((p) => (
        <PropertyChip key={p.id} name={p.name ?? byId.get(p.id)?.name} description={byId.get(p.id)?.description} />
      ))}
    </span>
  )
}
