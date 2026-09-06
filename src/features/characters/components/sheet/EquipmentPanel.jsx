import { useState } from 'react'
import { useCharacterItems } from '@/features/characters/queries.js'
import { useUiSet } from '@/lib/uiState.js'
import { diceTypeLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { EmptyState, Skeleton } from '@/components/ui'
import MoneyModal from './MoneyModal.jsx'

function ItemFacts({ item }) {
  const damage =
    item.damage_dice_count && item.damage_dice_type
      ? `${item.damage_dice_count}${diceTypeLabels[item.damage_dice_type] ?? item.damage_dice_type}${
          item.damage_type ? ` ${label(item.damage_type).toLowerCase()}` : ''
        }`
      : null
  const ac =
    item.armor_class_base != null && item.armor_class_base !== ''
      ? `${item.armor_class_base}${item.armor_class_dex_bonus ? ' + Ловкость' : ''}${
          item.armor_class_max_dex_bonus ? ` (макс. ${item.armor_class_max_dex_bonus})` : ''
        }`
      : null
  const properties = (item.weapon_properties ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => label(p))
    .join(', ')
  const rows = [
    item.rarity && item.rarity !== 'NONE' ? ['Редкость', label(item.rarity)] : null,
    item.requires_attunement != null ? ['Настройка', item.requires_attunement ? 'Требуется' : 'Не требуется'] : null,
    item.weight != null && item.weight !== '' ? ['Вес', `${item.weight} фнт.`] : null,
    item.cost_gold != null && item.cost_gold !== '' ? ['Цена', `${item.cost_gold} зм.`] : null,
    damage ? ['Урон', damage] : null,
    ac ? ['Класс доспеха', ac] : null,
    properties ? ['Свойства оружия', properties] : null,
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

function ItemRow({ ci, open, onToggle }) {
  const item = ci.item || {}
  const description = item.description?.trim()

  return (
    <li className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">
          {item.name ? sentenceCase(item.name) : `Предмет #${ci.item_id}`}
          {ci.quantity > 1 && <span className="ml-2 text-xs font-normal text-stone-400">×{ci.quantity}</span>}
        </span>
        {ci.is_equipped && (
          <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Экип.</span>
        )}
        {ci.is_attuned && (
          <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Настр.</span>
        )}
      </button>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3 text-sm text-stone-400">
          {item && <ItemFacts item={item} />}
          {description ? (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 leading-relaxed text-stone-200">
              {description}
            </p>
          ) : (
            <span className="text-stone-500">Описание отсутствует</span>
          )}
          {ci.notes && <p className="mt-1.5 text-stone-500">Заметка: {ci.notes}</p>}
        </div>
      )}
    </li>
  )
}

export default function EquipmentPanel({ character, onError }) {
  const { data: items = [], isLoading } = useCharacterItems(character.id)
  const [openIds, toggleId] = useUiSet(`equipment:${character.id}`)
  const [moneyOpen, setMoneyOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="w-fit">
        <div className="sheet-boxed__box p-0 min-w-28">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 py-1 text-left text-stone-200"
            onClick={() => setMoneyOpen(true)}
            title="Изменить деньги"
          >
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="text-yellow-300">⛁</span>
                <span>{character.money_gold ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-stone-300">⛀</span>
                <span>{character.money_silver ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-amber-700">⛁</span>
                <span>{character.money_copper ?? 0}</span>
              </span>
            </span>
          </button>
        </div>
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
        <ul className="space-y-2">
          {items.map((ci) => (
            <ItemRow
              key={ci.id}
              ci={ci}
              open={openIds.includes(String(ci.id))}
              onToggle={() => toggleId(String(ci.id))}
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