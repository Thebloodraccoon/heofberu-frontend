import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Modal } from '@/components/ui'

const clamp = (v) => Math.max(0, Math.min(13, v))

export default function InspirationModal({ character, onClose, onError }) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(clamp(Number(character.inspiration) || 0))

  const save = async () => {
    try {
      await api.update(character.id, { inspiration: value })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
      onClose()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Modal title="Вдохновение" onClose={onClose} size="xs">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() => setValue((v) => clamp(v - 1))}
          className="grid size-9 shrink-0 place-items-center rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
          aria-label="Уменьшить"
        >
          −
        </button>
        <span className="w-12 text-center font-display text-2xl font-bold text-stone-100">{value}</span>
        <button
          type="button"
          disabled={value >= 13}
          onClick={() => setValue((v) => clamp(v + 1))}
          className="grid size-9 shrink-0 place-items-center rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
          aria-label="Увеличить"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-stone-500">От 0 до 13</p>
      <div className="mt-4 modal-actions">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={save}>Сохранить</Button>
      </div>
    </Modal>
  )
}
