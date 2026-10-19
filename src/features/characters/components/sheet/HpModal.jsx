import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
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
    <SheetDrawer title="Хиты и отдых" onClose={onClose}>
      <div className="flex flex-col items-center">
        <p className="font-display text-3xl font-bold text-stone-100">
          {character.current_hp}
          <span className="text-base font-normal text-stone-400"> / {character.max_hp}</span>
        </p>
        <p className="mt-1 text-xs text-stone-500">Кость хитов: {character.hit_dice || '—'}</p>
      </div>
      <form className="character-hp-controls mt-4" aria-label="Изменение хитов" onSubmit={(event) => { event.preventDefault(); apply() }}>
        <Input
          type="number"
          aria-label="Изменение хитов"
          placeholder="Введите число"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          title="Положительное — лечение, отрицательное — урон"
        />
        <Button type="submit" disabled={delta === ''}>
          Применить
        </Button>
      </form>
      <div className="mt-4 grid grid-cols-2 gap-2 pt-4">
        <button type="button" className="sheet-btn" onClick={() => onRest('short')}>
          Короткий отдых
        </button>
        <button type="button" className="sheet-btn" onClick={() => onRest('long')}>
          Длинный отдых
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-stone-700/60 bg-stone-900 p-3">
        <p className="sheet-section-label !mt-0 !mb-0 self-center leading-none whitespace-nowrap">
          Временные хиты
        </p>
        <form className="character-hp-controls" aria-label="Временные хиты" onSubmit={(event) => { event.preventDefault(); applyTemp() }}>
          <Input className="min-w-0 flex-1" aria-label="Временные хиты" type="number" min="0" value={temp} onChange={(e) => setTemp(e.target.value)} />
          <Button type="submit" variant="ghost">Применить</Button>
        </form>
      </div>
    </SheetDrawer>
  )
}
