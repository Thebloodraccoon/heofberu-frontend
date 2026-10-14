import { useLayoutEffect, useRef, useState } from 'react'
import { clearRollHistory, loadRollHistory, togglePinRoll } from '@/lib/rollHistory.js'
import SheetDrawer from './SheetDrawer.jsx'
import { Button } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

function formatTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const day = date.toDateString() === now.toDateString()
    ? 'Сегодня'
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) })
  return `${day} · ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
}

function HistoryGroup({ title, pinned = false, rolls, onPin, empty }) {
  return (
    <section className="roll-history-group" aria-label={title}>
      <h3 className="sheet-section-label">
        {pinned && <LoreIcon name="pin" />}
        {title}
      </h3>
      {rolls.length > 0 ? (
        <ul className="roll-history-list">
          {rolls.map((roll) => (
            <li key={roll.id} className="roll-history-row" data-roll-id={roll.id} data-natural={roll.d20 === 1 || roll.d20 === 20 ? roll.d20 : undefined}>
              <div className="roll-history-copy">
                <p className="roll-history-title">{roll.title}</p>
                <div className="roll-history-meta">
                  {roll.detail && <span className="roll-history-formula">{roll.detail}</span>}
                  {roll.dice && <span>{roll.dice}</span>}
                  <span>{formatTime(roll.at)}</span>
                </div>
              </div>
              <strong className="roll-history-total" data-natural={roll.d20 === 1 || roll.d20 === 20 ? roll.d20 : undefined}>
                {roll.total}
              </strong>
              <button
                type="button"
                className="roll-history-pin"
                aria-pressed={!!roll.pinned}
                aria-label={`${roll.pinned ? 'Открепить' : 'Закрепить'}: ${roll.title}`}
                title={roll.pinned ? 'Открепить' : 'Закрепить'}
                onClick={() => onPin(roll.id)}
              >
                <LoreIcon name="pin" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="roll-history-empty">{empty}</p>}
    </section>
  )
}

export default function RollHistory() {
  const [open, setOpen] = useState(false)
  const [rolls, setRolls] = useState([])
  const contentRef = useRef(null)
  const positionsRef = useRef(new Map())
  const pinFocusRef = useRef(null)

  useLayoutEffect(() => {
    const rows = [...(contentRef.current?.querySelectorAll('[data-roll-id]') ?? [])]
    const animations = []
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    for (const row of rows) {
      const before = positionsRef.current.get(row.dataset.rollId)
      if (before !== undefined && !reducedMotion && typeof row.animate === 'function') {
        const shift = before - row.getBoundingClientRect().top
        if (shift) animations.push(row.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' }))
      }
      if (row.dataset.rollId === pinFocusRef.current) row.querySelector('button')?.focus({ preventScroll: true })
    }
    positionsRef.current.clear()
    pinFocusRef.current = null
    return () => animations.forEach((animation) => animation.cancel())
  }, [rolls, open])

  const capturePositions = () => {
    positionsRef.current = new Map([...(contentRef.current?.querySelectorAll('[data-roll-id]') ?? [])].map((row) => [row.dataset.rollId, row.getBoundingClientRect().top]))
  }

  const pinRoll = (id) => {
    capturePositions()
    pinFocusRef.current = String(id)
    togglePinRoll(id)
    setRolls(loadRollHistory())
  }

  const sorted = [...rolls].sort((a, b) => b.at - a.at)
  const pinned = sorted.filter((roll) => roll.pinned)
  const recent = sorted.filter((roll) => !roll.pinned)

  return (
    <>
      <Button variant="ghost" title="История бросков" aria-label="История бросков" onClick={() => {
        setRolls(loadRollHistory())
        setOpen(true)
      }}><LoreIcon name="history" /></Button>
      {open && (
        <SheetDrawer title="История бросков" className="roll-history-drawer" onClose={() => setOpen(false)}>
          <div ref={contentRef}>
            <div className="roll-history-toolbar">
              <p>При очистке истории закреплённые броски остаются.</p>
              <Button variant="ghost" className="roll-history-clear" disabled={recent.length === 0} onClick={() => {
                capturePositions()
                clearRollHistory()
                setRolls(loadRollHistory())
              }}><LoreIcon name="trash" />Очистить</Button>
            </div>
            {pinned.length > 0 && <HistoryGroup title="Закреплённые" pinned rolls={pinned} onPin={pinRoll} />}
            <HistoryGroup title="Последние броски" rolls={recent} onPin={pinRoll} empty={pinned.length ? 'Незакреплённых бросков нет' : 'Бросков пока нет'} />
          </div>
        </SheetDrawer>
      )}
    </>
  )
}
