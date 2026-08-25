import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Input, Modal } from '@/components/ui'

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
    <Modal title="Деньги" onClose={onClose} size="sm">
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
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={save}>Сохранить</Button>
      </div>
    </Modal>
  )
}
