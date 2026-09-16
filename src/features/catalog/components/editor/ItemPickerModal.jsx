import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { useItemDetail } from '@/features/catalog/queries.js'
import { diceTypeLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { Badge, Button, Input, Modal, RichText, Skeleton } from '@/components/ui'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import { ITEM_FILTERS } from './itemFilters.js'

const PAGE_SIZE = 30
const SCROLL_THRESHOLD = 120

// Тот же набор полей, что и в карточке предмета (ItemDetailCard), без
// заголовка — имя и так видно в строке аккордеона.
function ItemDetail({ itemId }) {
  const { data: it, isLoading } = useItemDetail(itemId)
  if (isLoading || !it) {
    return (
      <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )
  }

  const damage =
    it.damage_dice_count && it.damage_dice_type
      ? `${it.damage_dice_count}${diceTypeLabels[it.damage_dice_type] ?? it.damage_dice_type}${
          it.damage_type ? ` ${label(it.damage_type)}` : ''
        }`.trim()
      : null
  const ac =
    it.armor_class_base != null && it.armor_class_base !== ''
      ? `${it.armor_class_base}${it.armor_class_dex_bonus ? ' + Ловкость' : ''}${
          it.armor_class_max_dex_bonus ? ` (макс. ${it.armor_class_max_dex_bonus})` : ''
        }`
      : null
  const properties = (it.weapon_properties ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => label(p))
    .join(', ')
  const cost = it.cost_gold != null && it.cost_gold !== '' ? `${it.cost_gold} зм.` : null
  const weight = it.weight != null && it.weight !== '' ? `${it.weight} фнт.` : null

  const rows = [
    it.requires_attunement != null
      ? { key: 'attunement', label: 'Настройка', value: it.requires_attunement ? 'Требуется' : 'Не требуется' }
      : null,
    weight ? { key: 'weight', label: 'Вес', value: weight } : null,
    cost ? { key: 'cost', label: 'Цена', value: cost } : null,
    damage ? { key: 'damage', label: 'Урон', value: damage } : null,
    ac ? { key: 'ac', label: 'Класс доспеха', value: ac } : null,
    it.strength_requirement != null && it.strength_requirement !== ''
      ? { key: 'str', label: 'Требование силы', value: `Сила ${it.strength_requirement}` }
      : null,
    it.stealth_disadvantage ? { key: 'stealth', label: 'Скрытность', value: 'Помеха' } : null,
    properties ? { key: 'props', label: 'Свойства оружия', value: properties } : null,
  ].filter(Boolean)

  return (
    <div className="border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400">
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
      {it.description ? (
        <RichText value={it.description} className="text-stone-200" />
      ) : (
        <span className="text-stone-500">Описание отсутствует</span>
      )}
    </div>
  )
}

// Модалка выбора предмета для снаряжения — тот же стиль поиска, что и в
// основном списке ГМ-редактора: поле + кнопка «⌕» + «Фильтр», список
// подгружается по скроллу вниз, «Подробнее» раскрывает карточку в строке.
export default function ItemPickerModal({
  title = 'Предметы',
  subtitle = 'Поиск и выбор предмета',
  excludeIds,
  onPick,
  onClose,
}) {
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const listRef = useRef(null)

  const listParams = { page, size: PAGE_SIZE }
  if (appliedSearch.trim()) listParams.search = appliedSearch.trim()
  if (filters.item_type?.length) listParams.item_type = filters.item_type
  if (filters.rarity?.length) listParams.rarity = filters.rarity

  const listQ = useQuery({
    queryKey: ['catalog', 'item-picker-modal', appliedSearch.trim(), filters, page],
    queryFn: () => api.items.list(listParams),
  })

  // Смена поиска/фильтров начинает список заново, а не докидывает страницы
  // к прежней выборке.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    setAllItems([])
  }, [appliedSearch, filters])

  useEffect(() => {
    if (!listQ.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllItems((prev) => (page === 1 ? listQ.data.items : [...prev, ...listQ.data.items]))
  }, [listQ.data, page])

  const total = listQ.data?.total ?? 0
  const hasMore = allItems.length < total
  const items = allItems.filter((it) => !excludeIds.has(it.id))
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
    <Modal title={title} subtitle={subtitle} onClose={onClose} size="lg" scroll>
      <div className="mb-3 flex gap-2">
        <Input
          autoFocus
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Поиск предмета…"
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
        {!listQ.isFetching && items.length === 0 && <p className="text-sm text-stone-500">Ничего не найдено</p>}
        <ul className="space-y-1">
          {items.map((item) => {
            const isOpen = expanded.has(item.id)
            return (
              <li
                key={item.id}
                className={`rounded-lg border border-stone-700/60 bg-stone-900/60 transition ${isOpen ? 'bg-stone-900' : ''}`}
              >
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPick(item)
                      onClose()
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="truncate text-sm text-stone-100 hover:text-ember">{sentenceCase(item.name)}</span>
                    {item.item_type && (
                      <Badge tone="accent" className="shrink-0">
                        {label(item.item_type)}
                      </Badge>
                    )}
                    {item.rarity && item.rarity !== 'NONE' && (
                      <Badge
                        tone={item.rarity === 'LEGENDARY' || item.rarity === 'ARTIFACT' ? 'accent' : 'default'}
                        className="shrink-0"
                      >
                        {label(item.rarity)}
                      </Badge>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
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
                {isOpen && <ItemDetail itemId={item.id} />}
              </li>
            )
          })}
        </ul>
        {listQ.isFetching && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
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
          filters={ITEM_FILTERS}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Modal>
  )
}
