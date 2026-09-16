import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import { useSpellDetail } from '@/features/catalog/queries.js'
import { diceTypeLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { spellLevel } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'
import { Badge, Button, Input, Modal, RichText, Skeleton } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }
const PAGE_SIZE = 30
const SCROLL_THRESHOLD = 120

// Тот же набор полей, что и в карточке заклинания игрока/каталога
// (SpellDetailCard) — школа, время накладывания, дистанция, длительность,
// компоненты, урон/лечение, описание и «на более высоких уровнях».
function SpellDetail({ spellId }) {
  const { data: sp, isLoading } = useSpellDetail(spellId)
  if (isLoading || !sp) {
    return (
      <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )
  }

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
    sp.school ? { key: 'school', label: 'Школа', value: label(sp.school) } : null,
    sp.cast_time ? { key: 'cast', label: 'Время накладывания', value: label(sp.cast_time) } : null,
    rangeText ? { key: 'range', label: 'Дистанция', value: rangeText } : null,
    durationText ? { key: 'duration', label: 'Длительность', value: durationText } : null,
    componentsText ? { key: 'components', label: 'Компоненты', value: componentsText } : null,
    damageText ? { key: 'damage', label: 'Урон', value: damageText } : null,
    healingText ? { key: 'healing', label: 'Лечение', value: healingText } : null,
  ].filter(Boolean)

  const description = sp.description?.trim()

  return (
    <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
      {sp.is_ritual && (
        <span className="mb-1.5 inline-block rounded bg-stone-800 px-1.5 py-0.5 text-xs text-stone-300">Ритуал</span>
      )}
      {rows.length > 0 && (
        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map((r) => (
            <div key={r.key} className="col-span-2 flex gap-2">
              <dt className="shrink-0 text-stone-500">{r.label}:</dt>
              <dd className="text-stone-300">{r.value}</dd>
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

// Модалка выбора заклинания для статичного эффекта/варианта выбора — тот же
// стиль поиска, что и в основном списке ГМ-редактора: поле + кнопка «⌕» +
// «Фильтр», список подгружается по скроллу вниз, «Подробнее» раскрывает ту же
// карточку, что видит игрок.
export default function SpellPickerModal({ excludeIds = [], onPick, onClose }) {
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [allSpells, setAllSpells] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const listRef = useRef(null)
  const excluded = new Set(excludeIds)

  const listParams = { page, size: PAGE_SIZE }
  if (appliedSearch.trim()) listParams.search = appliedSearch.trim()
  for (const f of catalog.spells.filters) {
    if (Array.isArray(filters[f.name]) && filters[f.name].length > 0) listParams[f.name] = filters[f.name]
  }

  const listQ = useQuery({
    queryKey: ['catalog', 'spell-picker-modal', appliedSearch.trim(), filters, page],
    queryFn: () => api.spells.list(listParams),
  })

  // Смена поиска/фильтров начинает список заново, а не докидывает страницы
  // к прежней выборке.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    setAllSpells([])
  }, [appliedSearch, filters])

  useEffect(() => {
    if (!listQ.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllSpells((prev) => (page === 1 ? listQ.data.items : [...prev, ...listQ.data.items]))
  }, [listQ.data, page])

  const total = listQ.data?.total ?? 0
  const hasMore = allSpells.length < total
  const spells = allSpells.filter((sp) => !excluded.has(sp.id))
  const hasActiveFilters = Object.keys(filters).length > 0

  const applySearch = () => setAppliedSearch(queryInput)

  const onScroll = () => {
    const el = listRef.current
    if (!el || listQ.isFetching || !hasMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD) {
      setPage((p) => p + 1)
    }
  }

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Modal title="Заклинания" subtitle="Поиск и выбор заклинания" onClose={onClose} size="lg" scroll>
      <div className="mb-3 flex gap-2">
        <Input
          autoFocus
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Поиск заклинания…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={applySearch}
          title="Искать"
          className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 text-sm text-stone-200 transition hover:bg-stone-800"
        >
          ⌕
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`shrink-0 rounded border px-3 text-sm transition ${
            hasActiveFilters
              ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
              : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
          }`}
        >
          Фильтр
        </button>
      </div>
      <div ref={listRef} onScroll={onScroll} className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
        {!listQ.isFetching && spells.length === 0 && <p className="text-sm text-stone-500">Ничего не найдено</p>}
        <ul className="space-y-1">
          {spells.map((sp) => {
            const isOpen = expanded.has(sp.id)
            return (
              <li
                key={sp.id}
                className={`rounded-lg border border-stone-700/60 bg-stone-900/60 transition ${isOpen ? 'bg-stone-900' : ''}`}
              >
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPick(sp)
                      onClose()
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="truncate text-sm text-stone-100 hover:text-ember">{sentenceCase(sp.name)}</span>
                    {sp.level && (
                      <Badge tone="accent" className="shrink-0">
                        {spellLevel(sp.level)}
                      </Badge>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(sp.id)}
                    className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 transition hover:text-stone-100"
                    title={isOpen ? 'Свернуть' : 'Подробнее'}
                    aria-expanded={isOpen}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                {isOpen && <SpellDetail spellId={sp.id} />}
              </li>
            )
          })}
        </ul>
        {listQ.isFetching && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
      </div>
      <div className="modal-actions pt-3 mt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      </div>

      {showFilters && (
        <FilterModal
          filters={catalog.spells.filters}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Modal>
  )
}
