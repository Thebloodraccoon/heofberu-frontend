import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { num } from './constants.js'

export default function ArmorModal({ character, onClose, onSave }) {
  const [armorClass, setArmorClass] = useState(String(character.armor_class ?? 10))
  const [shield, setShield] = useState(String(character.shield ?? 0))

  const save = () => {
    onSave({
      armor_class: Math.max(0, num(armorClass) ?? 10),
      shield: Math.max(0, num(shield) ?? 0),
    })
  }

  return (
    <SheetDrawer title="Класс доспеха" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={save}>Сохранить</Button></>}>
      <div className="text-center">
        <p className="font-display text-3xl font-bold text-stone-100">
          {(num(armorClass) ?? 0) + (num(shield) ?? 0)}
        </p>
        <p className="mt-1 text-xs text-stone-500">КД = доспех + щит</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex-1 text-xs text-stone-500">
          Доспех
          <Input
            type="number"
            min="0"
            value={armorClass}
            onChange={(e) => setArmorClass(e.target.value)}
          />
        </label>
        <label className="flex-1 text-xs text-stone-500">
          Щит
          <Input
            type="number"
            min="0"
            value={shield}
            onChange={(e) => setShield(e.target.value)}
            title="Бонус щита (обычно +2)"
          />
        </label>
      </div>

    </SheetDrawer>
  )
}
