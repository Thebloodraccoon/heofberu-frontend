import CatalogSearchList from '@/features/catalog/components/CatalogSearchList.jsx'
import { useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { useItemDetail } from '@/features/catalog/queries.js'
import { itemKindLabels, itemKindPickLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { itemFactRows, itemKindText } from '@/lib/utils/itemFacts.js'
import { Badge, Button, Input, Modal, RichText, Skeleton } from '@/components/ui'
import { ITEM_FILTERS, ITEM_FILTERS_BY_KIND } from './itemFilters.js'
import Drawer from '@/components/ui/Drawer.jsx'
import WeaponPropertyChips from '@/features/catalog/components/WeaponPropertyChips.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import EditorAddButton from './EditorAddButton.jsx'

// Тот же набор полей, что и в карточке предмета (ItemDetailCard), без
// заголовка — имя и так видно в строке аккордеона.
function ItemDetail({ itemId, drawer = false }) {
  const { data: it, isLoading } = useItemDetail(itemId)
  if (isLoading || !it) {
    return (
      <div className={drawer ? 'grant-picker-detail' : 'border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400'}>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="mt-2 h-3 w-1/2" />
      </div>
    )
  }

  const rows = itemFactRows(it)

  return (
    <div className={drawer ? 'grant-picker-detail' : 'border-t border-stone-800 px-3 py-2.5 text-sm text-stone-400'}>
      {rows.length > 0 && (
        <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map((r) => (
            <div key={r.key} className="col-span-2 flex gap-2">
              <dt className="shrink-0 text-stone-500">{r.label}:</dt>
              <dd className="text-stone-300">{r.properties ? <WeaponPropertyChips properties={r.properties} /> : r.value}</dd>
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

// «Что добавить» — по кнопке на вид (Оружие / Доспех / Инструмент / Предмет + extra),
// клик сразу добавляет: onPick(value) — вид предмета (откроется ItemPickerModal kind=…)
// или ключ из extra (например, вариант-фильтр «Любой предмет вида»).
export function ItemKindAddControl({ onPick, extra = {} }) {
  return (
    <div role="group" aria-label="Что добавить" className="flex flex-wrap items-center gap-2">
      {Object.entries({ ...itemKindPickLabels, ...extra }).map(([key, text]) => (
        <EditorAddButton key={key} onClick={() => onPick(key)} aria-label={`Добавить: ${text}`}>{text}</EditorAddButton>
      ))}
    </div>
  )
}

// Модалка выбора предмета для снаряжения — тот же стиль поиска, что и в
// основном списке ГМ-редактора: поле + кнопка «⌕» + «Фильтр», список
// подгружается по скроллу вниз, «Подробнее» раскрывает карточку в строке.
function InlineItemPicker({ onClose, children }) {
  return <section className="equipment-picker-content"><button type="button" className="article-back inline-flex items-center gap-2 text-sm text-stone-300" onClick={onClose}><LoreIcon name="back" /> К снаряжению</button>{children}</section>
}

// kind — показывать только предметы этого вида (фильтры — по виду).
export default function ItemPickerModal({
  kind = null,
  title = kind ? itemKindLabels[kind] : 'Предметы',
  subtitle = 'Поиск и выбор предмета',
  excludeIds = new Set(),
  onPick,
  onClose,
  drawer = false,
  inline = false,
}) {
  const [selected, setSelected] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const quantityValid = Number.isInteger(Number(quantity)) && Number(quantity) >= 1
  const Container = inline ? InlineItemPicker : drawer ? Drawer : Modal
  const [expanded, setExpanded] = useState(() => new Set())
  const filterDefs = kind ? ITEM_FILTERS_BY_KIND[kind] : ITEM_FILTERS

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Container {...(drawer ? { bodyClassName: 'grant-picker-body' } : {})} title={title} subtitle={subtitle} onClose={onClose} size="lg" scroll footer={drawer && <div className="w-full space-y-3">{selected && <label className="block text-sm text-stone-300">Количество<Input className="mt-1 w-full" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>}<div className="article-filter-actions"><Button variant="ghost" onClick={onClose}>Отмена</Button><Button disabled={!selected || !quantityValid} onClick={() => { onPick(selected, Number(quantity)); onClose() }}>Выдать предмет</Button></div></div>}>
      <CatalogSearchList
        queryKey={queryKeys.pickers.items}
        list={api.items.list}
        params={kind ? { kind: [kind] } : {}}
        filters={filterDefs}
        exclude={(item) => excludeIds.has(item.id)}
        listClassName={drawer || inline ? 'grant-picker-list space-y-2 pr-1' : 'max-h-[55vh] space-y-1 overflow-y-auto pr-1'}
      >
        {(items) => <ul className={drawer ? 'space-y-2' : 'space-y-1'}>
          {items.map((item) => {
            const isOpen = expanded.has(item.id)
            return (
              <li
                key={item.id}
                className={drawer ? 'catalog-record-card grant-picker-card' : `rounded-lg border border-stone-700/60 bg-stone-900/60 transition ${isOpen ? 'bg-stone-900' : ''}`}
                data-active={drawer && selected?.id === item.id}
              >
                <div className={drawer ? 'grant-picker-row' : 'flex items-center gap-2 px-3 py-1.5'}>
                  <button
                    type="button"
                    onClick={() => {
                      if (drawer) { setSelected(item); return }
                      onPick(item)
                      onClose()
                    }}
                    className={drawer ? 'grant-picker-select' : 'flex min-w-0 flex-1 items-center gap-2 text-left'}
                    aria-pressed={drawer ? selected?.id === item.id : undefined}
                  >
                    <span className="truncate text-sm text-stone-100 hover:text-ember">{sentenceCase(item.name)}</span>
                    {item.kind && (
                      <Badge tone="accent" className="shrink-0">
                        {itemKindText(item)}
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
                    className="grant-picker-expand"
                    aria-label={`Посмотреть: ${item.name}`}
                    title={isOpen ? 'Свернуть' : 'Подробнее'}
                    aria-expanded={isOpen}
                  >
                    <LoreIcon name="chevron" className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                </div>
                {isOpen && <ItemDetail itemId={item.id} drawer={drawer} />}
              </li>
            )
          })}
        </ul>}
      </CatalogSearchList>

      {!drawer && !inline && <div className="flex pt-3 mt-4">
        <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
          Закрыть
        </Button>
      </div>}


    </Container>
  )
}
