import { useState } from 'react'
import { Input, Modal } from '@/components/ui'
import { num } from './constants.js'

export default function HpModal({ character, onClose, onDelta, onRest }) {
  const [delta, setDelta] = useState('')
  const apply = () => {
    if (delta === '') return
    onDelta(num(delta))
    setDelta('')
  }
  return (
    <Modal title="Хиты и отдых" onClose={onClose} size="sm">
      <div className="text-center">
        <p className="font-display text-3xl font-bold text-stone-100">
          {character.current_hp}
          <span className="text-base font-normal text-stone-400"> / {character.max_hp}</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">Кость хитов: {character.hit_dice || '—'}</p>
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          type="number"
          placeholder="Введите число"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          title="Положительное — лечение, отрицательное — урон"
        />
        <button type="button" className="sheet-btn sheet-btn_primary" onClick={apply}>
          Применить
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-700/70 pt-4">
        <button type="button" className="sheet-btn" onClick={() => onRest('short')}>
          Короткий отдых
        </button>
        <button type="button" className="sheet-btn" onClick={() => onRest('long')}>
          Длинный отдых
        </button>
      </div>
    </Modal>
  )
}
