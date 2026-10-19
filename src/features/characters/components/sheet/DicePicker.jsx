import { useState } from 'react'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import DiceIcon from '@/components/sheet/DiceIcon.jsx'
import { Button } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

const DICE = [4, 6, 8, 10, 12, 20, 100]
const MAX_COUNT = 99

export default function DicePicker({ onRoll }) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const qty = DICE.reduce((sum, sides) => sum + (counts[sides] ?? 0), 0)
  const formula = DICE.filter((sides) => counts[sides] > 0).map((sides) => `${counts[sides]}к${sides}`).join(' + ')

  const changeCount = (sides, delta) => {
    setCounts((current) => {
      const count = Math.max(0, Math.min(MAX_COUNT, (current[sides] ?? 0) + delta))
      const next = { ...current }
      if (count) next[sides] = count
      else delete next[sides]
      return next
    })
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}><LoreIcon name="dice" />Броски</Button>
      {open && (
        <SheetDrawer
          title="Бросок кубиков"
          className="character-dice-drawer"
          onClose={() => setOpen(false)}
          footer={<>
            <Button variant="ghost" disabled={qty === 0} onClick={() => setCounts({})}><LoreIcon name="trash" />Очистить</Button>
            <Button disabled={qty === 0} onClick={() => {
              onRoll(counts)
              setCounts({})
              setOpen(false)
            }}><LoreIcon name="dice" />Бросить</Button>
          </>}
        >
          <div className="character-dice-summary" aria-live="polite" aria-atomic="true">
            <p className="character-dice-formula">{formula || 'Выберите кубики'}</p>
            <p className="character-dice-quantity">Выбрано кубиков: {qty}</p>
          </div>
          <div className="character-dice-grid">
            {DICE.map((sides) => {
              const count = counts[sides] ?? 0
              return (
                <div key={sides} className="character-dice-tile" data-selected={count > 0}>
                  <button type="button" className="character-dice-select" aria-label={`Выбрать к${sides}`} disabled={count >= MAX_COUNT} onClick={() => changeCount(sides, 1)}>
                    <DiceIcon sides={sides} />
                    <span>к{sides}</span>
                  </button>
                  <div className="character-dice-counter">
                    <button type="button" className="character-dice-step" aria-label={`Убрать к${sides}`} disabled={count === 0} onClick={() => changeCount(sides, -1)}><LoreIcon name="minus" /></button>
                    <span key={count} className="character-dice-count" aria-label={`Количество к${sides}: ${count}`}>{count}</span>
                    <button type="button" className="character-dice-step" aria-label={`Добавить к${sides}`} disabled={count >= MAX_COUNT} onClick={() => changeCount(sides, 1)}><LoreIcon name="plus" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </SheetDrawer>
      )}
    </>
  )
}
