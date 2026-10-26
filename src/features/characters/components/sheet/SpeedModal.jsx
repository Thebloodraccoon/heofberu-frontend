import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { CombatPanel, SpeedTable } from './CombatStatsTables.jsx'
import { num } from './constants.js'

// Как окно КД: сверху крупно скорость ходьбы с листа, под ней поле и «Задать»,
// ниже — расчёт движка по снаряжению и особенностям.
export default function SpeedModal({ character, combat, onClose, onSave }) {
  const [speed, setSpeed] = useState(String(character.speed ?? 30))
  const save = () => onSave({ speed: Math.max(0, num(speed) ?? 0) })

  return (
    <SheetDrawer title="Скорость" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Закрыть</Button>}>
      <div className="text-center">
        <p className="font-display text-3xl font-bold text-stone-100">{character.speed ?? 30} фт</p>
        <p className="mt-1 text-xs text-stone-500">Скорость ходьбы на листе</p>
      </div>
      <form
        className="mt-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Input
          className="flex-1"
          type="number"
          min="0"
          step="5"
          aria-label="Скорость ходьбы на листе, фт"
          value={speed}
          onChange={(e) => setSpeed(e.target.value)}
        />
        <Button type="submit">Задать</Button>
      </form>
      {combat && (
        <CombatPanel title="Расчёт по снаряжению и особенностям" total={`${combat.computed?.walk ?? '—'} фт`}>
          <SpeedTable speed={combat} hideTitle />
        </CombatPanel>
      )}
    </SheetDrawer>
  )
}
