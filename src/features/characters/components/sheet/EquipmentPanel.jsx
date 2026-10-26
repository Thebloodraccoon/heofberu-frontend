import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useState } from 'react'
import { useCharacterItems, useSetItemEquipped } from '@/features/characters/queries.js'
import { useUiSet } from '@/lib/uiState.js'
import { flattenItem } from '@/lib/utils/itemFacts.js'
import WeaponPropertyChips from '@/features/catalog/components/WeaponPropertyChips.jsx'
import {
  armorCategoryLabels,
  diceTypeLabels,
  label,
  sentenceCase,
  toolCategoryLabels,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { Button, EmptyState, RichText, Skeleton } from '@/components/ui'
import MoneyModal from './MoneyModal.jsx'

// Кость урона «1к8» (тип урона — отдельно).
const diceText = (count, type) => (count && type ? `${count}${diceTypeLabels[type] ?? type}` : null)

// КД предмета: щит прибавляется (+2), лёгкий/средний доспех — база + Ловкость
// (у среднего с потолком), тяжёлый — только база.
function armorClassText(item) {
  if (item.armor_class_base == null || item.armor_class_base === '') return null
  if (item.armor_category === 'SHIELD') return `+${item.armor_class_base}`
  if (item.armor_category === 'HEAVY') return `${item.armor_class_base}`
  const cap = item.armor_class_max_dex_bonus != null ? ` (макс. ${item.armor_class_max_dex_bonus})` : ''
  return `${item.armor_class_base} + Ловкость${cap}`
}

function ItemFacts({ item: record }) {
  const item = flattenItem(record)
  const dice = diceText(item.damage_dice_count, item.damage_dice_type)
  const versatile = diceText(item.versatile_dice_count, item.versatile_dice_type)
  const damage = dice
    ? `${dice}${versatile ? ` (${versatile} двумя руками)` : ''}${item.damage_type ? ` ${label(item.damage_type).toLowerCase()}` : ''}`
    : null
  const ac = armorClassText(item)
  const range =
    item.range_normal != null ? `${item.range_normal}${item.range_long != null ? `/${item.range_long}` : ''} фт.` : null
  const category =
    weaponProficiencyLabels[item.weapon_category] ??
    armorCategoryLabels[item.armor_category] ??
    toolCategoryLabels[item.tool_category] ??
    null
  const rows = [
    item.rarity && item.rarity !== 'NONE' ? ['Редкость', label(item.rarity)] : null,
    item.requires_attunement != null ? ['Настройка', item.requires_attunement ? 'Требуется' : 'Не требуется'] : null,
    item.weight != null && item.weight !== '' ? ['Вес', `${item.weight} фнт.`] : null,
    item.cost_gold != null && item.cost_gold !== '' ? ['Цена', `${item.cost_gold} зм.`] : null,
    category ? ['Категория', category] : null,
    damage ? ['Урон', damage] : null,
    range ? ['Дистанция', range] : null,
    ac ? ['Класс доспеха', ac] : null,
    item.properties?.length ? ['Свойства оружия', <WeaponPropertyChips properties={item.properties} />] : null,
  ].filter(Boolean)

  if (rows.length === 0) return null
  return (
    <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="col-span-2 flex gap-2">
          <dt className="shrink-0 text-stone-500">{k}:</dt>
          <dd className="text-stone-300">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

// Надеть можно то, что персонаж буквально носит: доспехи и щиты, а из снаряжения —
// всё, кроме расходников и того, что держат в руках (зелья, свитки, боеприпасы,
// сокровища, жезлы, посохи, палочки). Оружие и инструменты — нет.
const NOT_WORN_GEAR = new Set(['POTION', 'SCROLL', 'AMMUNITION', 'TREASURE', 'ROD', 'STAFF', 'WAND'])
const isWearable = (item) => item?.kind === 'ARMOR' || (item?.kind === 'GEAR' && !NOT_WORN_GEAR.has(item.subtype))

function ItemRow({ ci, open, onToggle, onEquip, equipping }) {
  const item = ci.item || {}
  const description = item.description?.trim()

  return (
    <li className="character-record-card character-record-card--accordion">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-left"
        >
          <LoreIcon name="chevron" className={`text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="min-w-0 flex-1 break-words text-sm font-medium text-stone-100">
            {item.name ? sentenceCase(item.name) : `Предмет #${ci.item_id}`}
            {ci.quantity > 1 && <span className="ml-2 text-xs font-normal text-stone-400">×{ci.quantity}</span>}
          </span>
          {ci.is_attuned && (
            <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Настр.</span>
          )}
        </button>
        {/* Эффекты скорости/КД (кольцо, сапоги) действуют, только пока предмет надет. Уже надетое
            (надели раньше) можно снять всегда. Имя кнопки постоянное, состояние — aria-pressed. */}
        {(isWearable(item) || ci.is_equipped) && <button
          type="button"
          onClick={onEquip}
          disabled={equipping}
          aria-label="Надето"
          aria-pressed={!!ci.is_equipped}
          className={`sheet-chip mr-3 !py-0.5 text-[11px] ${ci.is_equipped ? 'sheet-chip_on' : ''}`}
        >
          <span className="sheet-chip__dot" />
          {ci.is_equipped ? 'Надето' : 'Не надето'}
        </button>}
      </div>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3 text-sm text-stone-400">
          {item && <ItemFacts item={item} />}
          {description ? (
            <RichText value={description} className="text-stone-200" />
          ) : (
            <span className="text-stone-500">Описание отсутствует</span>
          )}
        </div>
      )}
    </li>
  )
}

export default function EquipmentPanel({ character, onError }) {
  const { data: items = [], isLoading } = useCharacterItems(character.id)
  const [openIds, toggleId] = useUiSet(`equipment:${character.id}`)
  const [moneyOpen, setMoneyOpen] = useState(false)
  const setEquipped = useSetItemEquipped(character.id)

  return (
    <div className="space-y-4">
      <div className="character-record-heading">
        <h2 className="sheet-section-label">Снаряжение</h2>
        <Button variant="ghost" onClick={() => setMoneyOpen(true)} title="Изменить деньги">
          {character.money_gold ?? 0} зм · {character.money_silver ?? 0} см · {character.money_copper ?? 0} мм
        </Button>
      </div>
      {isLoading ? (
        <ul className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5"
            >
              <Skeleton className="size-3.5" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="ml-auto h-3.5 w-16" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState text="Инвентарь пуст" />
      ) : (
        <ul className="space-y-3">
          {items.map((ci) => (
            <ItemRow
              key={ci.id}
              ci={ci}
              open={openIds.includes(String(ci.id))}
              onToggle={() => toggleId(String(ci.id))}
              equipping={setEquipped.isPending && setEquipped.variables?.stackId === ci.id}
              onEquip={() => setEquipped.mutate({ stackId: ci.id, isEquipped: !ci.is_equipped }, { onError })}
            />
          ))}
        </ul>
      )}

      {moneyOpen && (
        <MoneyModal character={character} onClose={() => setMoneyOpen(false)} onError={onError} />
      )}
    </div>
  )
}