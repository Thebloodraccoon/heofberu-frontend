import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { useCharacterItems } from '@/features/characters/queries.js'
import { useItemDetail, useItems } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useUiSet } from '@/lib/uiState.js'
import { diceTypeLabels, label } from '@/lib/i18n/index.js'
import { Button, EmptyState, Input } from '@/components/ui'

function ItemFacts({ detail }) {
  const damage =
    detail.damage_dice_count && detail.damage_dice_type
      ? `${detail.damage_dice_count}${diceTypeLabels[detail.damage_dice_type] ?? detail.damage_dice_type}${
          detail.damage_type ? ` ${label(detail.damage_type).toLowerCase()}` : ''
        }`
      : null
  const ac =
    detail.armor_class_base != null && detail.armor_class_base !== ''
      ? `${detail.armor_class_base}${detail.armor_class_dex_bonus ? ' + Ловкость' : ''}${
          detail.armor_class_max_dex_bonus ? ` (макс. ${detail.armor_class_max_dex_bonus})` : ''
        }`
      : null
  const properties = (detail.weapon_properties ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => label(p))
    .join(', ')
  const rows = [
    detail.rarity && detail.rarity !== 'NONE' ? ['Редкость', label(detail.rarity)] : null,
    detail.requires_attunement != null ? ['Настройка', detail.requires_attunement ? 'Требуется' : 'Не требуется'] : null,
    detail.weight != null && detail.weight !== '' ? ['Вес', `${detail.weight} фнт.`] : null,
    detail.cost_gold != null && detail.cost_gold !== '' ? ['Цена', `${detail.cost_gold} зм.`] : null,
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

function ItemRow({ ci, catalogName, open, onToggle }) {
  const { data: detail } = useItemDetail(open ? ci.item_id : undefined)
  const description = detail?.description?.trim()

  return (
    <li className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">
          {catalogName || `Предмет #${ci.item_id}`}
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
          {detail && <ItemFacts detail={detail} />}
          {description ? (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-3 leading-relaxed text-stone-200">
              {description.length > 600 ? `${description.slice(0, 600)}…` : description}
            </p>
          ) : (
            !detail && <p className="text-stone-500">Загрузка...</p>
          )}
          {ci.notes && <p className="mt-1.5 text-stone-500">Заметка: {ci.notes}</p>}
        </div>
      )}
    </li>
  )
}

export default function EquipmentPanel({ character, onError }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const { data: catalog = [] } = useItems({ size: 100 })
  const [openIds, toggleId] = useUiSet(`equipment:${character.id}`)
  const nameOf = (idv) => catalog.find((x) => Number(x.id) === Number(idv))?.name
  const [editMoney, setEditMoney] = useState(false)
  const [money, setMoney] = useState({ gold: '', silver: '', copper: '' })

  const startMoneyEdit = () => {
    setMoney({
      gold: String(character.money_gold ?? 0),
      silver: String(character.money_silver ?? 0),
      copper: String(character.money_copper ?? 0),
    })
    setEditMoney(true)
  }

  const saveMoney = async () => {
    try {
      await api.update(character.id, {
        money_gold: Math.max(0, Number(money.gold) || 0),
        money_silver: Math.max(0, Number(money.silver) || 0),
        money_copper: Math.max(0, Number(money.copper) || 0),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
      setEditMoney(false)
    } catch (e) {
      onError(e)
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <EmptyState text="Инвентарь пуст" />
      ) : (
        <ul className="space-y-2">
          {items.map((ci) => (
            <ItemRow
              key={ci.id}
              ci={ci}
              catalogName={nameOf(ci.item_id)}
              open={openIds.includes(String(ci.id))}
              onToggle={() => toggleId(String(ci.id))}
            />
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
        <div className="flex items-center justify-between">
          <p className="sheet-section-label !mt-0">Деньги</p>
          {!editMoney && (
            <button
              type="button"
              className="rounded p-1.5 text-stone-400 transition hover:bg-stone-800 hover:text-ember"
              title="Изменить деньги"
              onClick={startMoneyEdit}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
          )}
        </div>
        {editMoney ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-stone-500">
              зм
              <Input type="number" min="0" className="!w-20" value={money.gold} onChange={(e) => setMoney({ ...money, gold: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500">
              см
              <Input type="number" min="0" className="!w-20" value={money.silver} onChange={(e) => setMoney({ ...money, silver: e.target.value })} />
            </label>
            <label className="text-xs text-stone-500">
              мм
              <Input type="number" min="0" className="!w-20" value={money.copper} onChange={(e) => setMoney({ ...money, copper: e.target.value })} />
            </label>
            <div className="flex gap-2">
              <Button onClick={saveMoney}>Сохранить</Button>
              <Button variant="ghost" onClick={() => setEditMoney(false)}>Отмена</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-5 text-sm">
            <span className="text-stone-200"><span className="text-yellow-300">⛁</span> {character.money_gold ?? 0} зм</span>
            <span className="text-stone-200"><span className="text-stone-300">⛀</span> {character.money_silver ?? 0} см</span>
            <span className="text-stone-200"><span className="text-amber-700">⛁</span> {character.money_copper ?? 0} мм</span>
          </div>
        )}
      </div>
    </div>
  )
}
