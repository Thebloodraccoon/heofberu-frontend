import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Input, Modal } from '@/components/ui'

// Пропускаем только цифры и не даём уйти ниже нуля.
const sanitizeMoney = (raw) => {
  const digits = String(raw).replace(/[^\d]/g, '')
  if (digits === '') return ''
  return String(Math.max(0, Math.min(9999999, Number(digits))))
}

export default function MoneyModal({ character, onClose, onError }) {
  const queryClient = useQueryClient()
  const [money, setMoney] = useState({
    gold: String(character.money_gold ?? 0),
    silver: String(character.money_silver ?? 0),
    copper: String(character.money_copper ?? 0),
  })

  const save = async () => {
    try {
      await api.update(character.id, {
        money_gold: Math.max(0, Number(money.gold) || 0),
        money_silver: Math.max(0, Number(money.silver) || 0),
        money_copper: Math.max(0, Number(money.copper) || 0),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
      onClose()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Modal title="Деньги" onClose={onClose} size="xs">
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-2.5 text-xs text-stone-500">
          Золото
          <Input type="text" inputMode="numeric" min="0" className="!w-20" value={money.gold} onChange={(e) => setMoney({ ...money, gold: sanitizeMoney(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-2.5 text-xs text-stone-500">
          Серебро
          <Input type="text" inputMode="numeric" min="0" className="!w-20" value={money.silver} onChange={(e) => setMoney({ ...money, silver: sanitizeMoney(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-2.5 text-xs text-stone-500">
          Медь
          <Input type="text" inputMode="numeric" min="0" className="!w-20" value={money.copper} onChange={(e) => setMoney({ ...money, copper: sanitizeMoney(e.target.value) })} />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={save}>Сохранить</Button>
      </div>
    </Modal>
  )
}
