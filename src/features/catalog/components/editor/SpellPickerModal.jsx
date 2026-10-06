import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import CatalogFilterSummary from '@/features/catalog/components/CatalogFilterSummary.jsx'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import { useSpellDetail } from '@/features/catalog/queries.js'
import { diceTypeLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { spellLevel } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'
import { Badge, Button, Modal, RichText, Skeleton } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }
const PAGE_SIZE = 30
const SCROLL_THRESHOLD = 120

// Тот же набор полей, что и в карточке заклинания игрока/каталога
// (SpellDetailCard) — школа, время накладывания, дистанция, длительность,
// компоненты, урон/лечение, описание и «на более высоких уровнях».
function SpellDetail({ spellId, drawer = false }) {
  const { data: sp, isLoading } = useSpellDetail(spellId)
  if (isLoading || !sp) {
    return (
      <div className={drawer ? 'grant-picker-detail' : 'border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400'}>
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
    <div className={drawer ? 'grant-picker-detail' : 'border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400'}>
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
function InlineSpellPicker({ onClose, children }) {
  return <section className="space-y-4"><Button type="button" variant="ghost" onClick={onClose}><LoreIcon name="back" /> К эффекту</Button><h3 className="article-editor-label">Выбрать заклинание</h3>{children}</section>
}

export default function SpellPickerModal({ excludeIds = [], onPick, onClose, drawer = false, inline = false }) {
  const [selected, setSelected] = useState(null)
  const Container = inline ? InlineSpellPicker : drawer ? Drawer : Modal
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
    <Container {...(drawer ? { bodyClassName: 'grant-picker-body' } : {})} title={drawer ? 'Выдать заклинание' : 'Заклинания'} subtitle="Поиск и выбор заклинания" onClose={onClose} size="lg" scroll footer={drawer && <div className="article-filter-actions"><Button variant="ghost" onClick={onClose}>Отмена</Button><Button disabled={!selected} onClick={() => { onPick(selected); onClose() }}>Выдать заклинание</Button></div>}>
      <div className="mb-3"><SearchToolbar query={queryInput} onQueryChange={setQueryInput} onSearch={applySearch} onFilters={catalog.spells.filters?.length ? () => setShowFilters((open) => !open) : undefined} filtersInline={drawer || inline} filtersOpen={showFilters} filterCount={Object.values(filters).reduce((count, values) => count + values.length, 0)} placeholder="Название или описание…" label="Поиск записей" /></div><CatalogFilterSummary definitions={catalog.spells.filters} value={filters} onChange={setFilters} />
      {showFilters && (
        <FilterModal
          inline={drawer || inline}
          filters={catalog.spells.filters}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
      <div ref={listRef} onScroll={onScroll} className={drawer ? 'grant-picker-list space-y-2 pr-1' : 'max-h-[55vh] space-y-1 overflow-y-auto pr-1'}>
        {!listQ.isFetching && spells.length === 0 && <p className="text-sm text-stone-500">Ничего не найдено</p>}
        <ul className={drawer ? 'space-y-2' : 'space-y-1'}>
          {spells.map((sp) => {
            const isOpen = expanded.has(sp.id)
            return (
              <li
                key={sp.id}
                className={drawer ? 'catalog-record-card grant-picker-card' : `rounded-lg border border-stone-700/60 bg-stone-900/60 transition ${isOpen ? 'bg-stone-900' : ''}`}
                data-active={drawer && selected?.id === sp.id}
              >
                <div className={drawer ? 'grant-picker-row' : 'flex items-center gap-2 px-3 py-1.5'}>
                  <button
                    type="button"
                    onClick={() => {
                      if (drawer) { setSelected(sp); return }
                      onPick(sp)
                      onClose()
                    }}
                    className={drawer ? 'grant-picker-select' : 'flex min-w-0 flex-1 items-center gap-2 text-left'}
                    aria-pressed={drawer ? selected?.id === sp.id : undefined}
                  >
                    <span className="truncate text-sm text-stone-100 hover:text-ember">{sentenceCase(sp.name)}</span>
                    {sp.level != null && (
                      <Badge tone="accent" className="shrink-0">
                        {spellLevel(sp.level)}
                      </Badge>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(sp.id)}
                    className="grant-picker-expand"
                    aria-label={`Посмотреть: ${sp.name}`}
                    title={isOpen ? 'Свернуть' : 'Подробнее'}
                    aria-expanded={isOpen}
                  >
                    <LoreIcon name="chevron" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                {isOpen && <SpellDetail spellId={sp.id} drawer={drawer} />}
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
      {!drawer && <div className="flex pt-3 mt-4">
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Закрыть
        </Button>
      </div>}


    </Container>
  )
}
