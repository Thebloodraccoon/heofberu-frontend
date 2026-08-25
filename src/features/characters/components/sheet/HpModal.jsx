import { useState } from 'react'
import { Input, Modal } from '@/components/ui'
import { num } from './constants.js'

export default function HpModal({ character, onClose, onDelta, onTempHp, onRest }) {
  const [delta, setDelta] = useState('')
  const [temp, setTemp] = useState(String(character.temp_hp ?? 0))
  const apply = () => {
    if (delta === '') return
    onDelta(num(delta))
    setDelta('')
  }
  const applyTemp = () => {
    onTempHp(Math.max(0, num(temp) ?? 0))
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
      <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
        <p className="sheet-section-label !mt-0">
          Временные хиты
          <span className="ml-2 text-sm font-normal text-stone-300">{character.temp_hp ?? 0}</span>
        </p>
        <div className="flex gap-2">
          <Input type="number" min="0" className="!w-20" value={temp} onChange={(e) => setTemp(e.target.value)} />
          <button type="button" className="sheet-btn !py-1.5 text-xs" onClick={applyTemp}>
            Задать
          </button>
        </div>
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
