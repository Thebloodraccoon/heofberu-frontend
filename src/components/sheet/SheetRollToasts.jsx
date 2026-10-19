import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

const LIFETIME = 8000
const TICK = 100

export default function SheetRollToasts({ toasts, onDismiss }) {
  return createPortal(
    <div className="sheet-roll-results" aria-label="Результаты бросков">
      {[...toasts].reverse().map((toast, index) => (
        <Toast key={toast.id} toast={toast} compact={index > 0} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  )
}

function Toast({ toast, compact, onDismiss }) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])
  const [remaining, setRemaining] = useState(LIFETIME)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused

  useEffect(() => {
    if (paused) return undefined
    let lastTick = Date.now()
    const timer = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastTick
      lastTick = now
      setRemaining((value) => Math.max(0, value - elapsed))
    }, TICK)
    return () => clearInterval(timer)
  }, [paused])

  useEffect(() => {
    if (remaining === 0) onDismissRef.current(toast.id)
  }, [remaining, toast.id])

  const rolls = Array.isArray(toast.rolls) ? toast.rolls : null
  const bonus = Number(toast.bonus) || 0
  const natural = !rolls && (toast.d20 === 20 || toast.d20 === 1) ? toast.d20 : null
  const detail = rolls ? rolls.join(' + ') || '0' : String(toast.d20)
  const modifier = bonus ? ` ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)}` : ''

  return (
    <article
      className={`sheet-roll-result ${compact ? 'sheet-roll-result--compact' : ''}`}
      aria-label={toast.title}
      data-natural={natural ?? undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div role="status" className="sheet-roll-result-content">
        {!compact && <p className="sheet-roll-result-title">{toast.title}</p>}
        <strong className="sheet-roll-result-total">{toast.total}</strong>
        {!compact && <p className="sheet-roll-result-detail">{detail}{modifier}</p>}
      </div>
      <button type="button" className="sheet-roll-result-close" onClick={() => onDismiss(toast.id)} aria-label="Закрыть">
        <LoreIcon name="close" />
      </button>
      <div className="sheet-roll-result-progress" role="progressbar" aria-label="Время до скрытия результата" aria-valuemin={0} aria-valuemax={8} aria-valuenow={Math.ceil(remaining / 1000)} aria-valuetext={paused ? 'Таймер приостановлен' : `Осталось ${Math.ceil(remaining / 1000)} с`}>
        <span style={{ transform: `scaleX(${remaining / LIFETIME})`, animationPlayState: paused ? 'paused' : 'running' }} />
      </div>
    </article>
  )
}
