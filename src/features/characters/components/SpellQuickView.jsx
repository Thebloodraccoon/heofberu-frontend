import { useSpellDetail } from '@/features/catalog/queries.js'
import { label, diceTypeLabels } from '@/lib/i18n/index.js'
import { RichText, Skeleton } from '@/components/ui'

// Быстрый просмотр заклинания (школа, время, дистанция, компоненты, урон,
// описание) под строкой списка — общий для изучения заклинания на листе
// (SpellPickerModal) и выбора «любого заклинания» в «Выборах».

// Стрелка «Подробнее/Свернуть» — раскрывает описание заклинания под строкой.
export function ExpandToggle({ open, onClick, name }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={`${open ? 'Свернуть' : 'Подробнее'}: ${name}`}
      title={open ? 'Свернуть' : 'Подробнее'}
      className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 transition hover:text-stone-100"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        aria-hidden="true"
      >
        <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }

export function SpellDetailFetched({ spellId }) {
  const { data: sp, isLoading } = useSpellDetail(spellId)
  if (isLoading || !sp) {
    return (
      <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )
  }
  return <SpellDetail sp={sp} />
}

function SpellDetail({ sp }) {
  const components = (sp.components ?? []).map((c) => COMPONENT_FULL[c] ?? label(c)).join(', ')
  const rangeText =
    sp.range_value != null && sp.range_value !== ''
      ? `${sp.range_value} футов`
      : sp.range_type
        ? label(sp.range_type)
        : null
  const durationText = sp.duration
    ? sp.is_concentration
      ? `Концентрация, вплоть до ${label(sp.duration)}`
      : label(sp.duration)
    : null
  const componentsText =
    sp.components && sp.components.length > 0
      ? sp.components.includes('MATERIAL') && sp.material
        ? `${components} (${sp.material})`
        : components
      : null
  const damageText =
    sp.damage_dice_count && sp.damage_dice_type
      ? `${sp.damage_dice_count}${diceTypeLabels[sp.damage_dice_type] ?? sp.damage_dice_type}${
          sp.damage_type ? ` ${label(sp.damage_type)}` : ''
        }`.trim()
      : null
  const healingText =
    sp.healing_dice_count && sp.healing_dice_type
      ? `${sp.healing_dice_count}${diceTypeLabels[sp.healing_dice_type] ?? sp.healing_dice_type}${
          sp.healing_target ? ` ${label(sp.healing_target)}` : ''
        }`.trim()
      : null
  const rows = [
    sp.school ? { label: 'Школа', value: label(sp.school) } : null,
    sp.cast_time ? { label: 'Время накладывания', value: label(sp.cast_time) } : null,
    rangeText ? { label: 'Дистанция', value: rangeText } : null,
    durationText ? { label: 'Длительность', value: durationText } : null,
    componentsText ? { label: 'Компоненты', value: componentsText } : null,
    damageText ? { label: 'Урон', value: damageText } : null,
    healingText ? { label: 'Лечение', value: healingText } : null,
  ].filter(Boolean)
  const description = sp.description?.trim()

  return (
    <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
      {rows.length > 0 && (
        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map(({ label: l, value }) => (
            <div key={l} className="col-span-2 flex gap-2">
              <dt className="shrink-0 text-stone-500">{l}:</dt>
              <dd className="text-stone-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {description ? (
        <RichText value={description} className="text-stone-200" />
      ) : (
        <span className="text-stone-500">Описание отсутствует</span>
      )}
      {sp.higher_levels && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            На более высоких уровнях
          </p>
          <RichText value={sp.higher_levels} className="text-stone-300" />
        </div>
      )}
    </div>
  )
}
