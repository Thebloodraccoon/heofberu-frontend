import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button } from '@/components/ui'

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
    <SheetDrawer title="Вдохновение" onClose={onClose} footer={<>
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={save}>Сохранить</Button>
      </>}>
      {/* Как окно КД: крупное число и подпись, под ними две большие кнопки, как у отдыха. */}
      <div className="text-center">
        <p className="font-display text-3xl font-bold text-stone-100" aria-live="polite">{value}</p>
        <p className="mt-1 text-xs text-stone-500">Очки вдохновения · от 0 до 13</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="sheet-btn" disabled={value <= 0} onClick={() => setValue((v) => clamp(v - 1))}>
          Отнять
        </button>
        <button type="button" className="sheet-btn" disabled={value >= 13} onClick={() => setValue((v) => clamp(v + 1))}>
          Добавить
        </button>
      </div>

    </SheetDrawer>
  )
}
