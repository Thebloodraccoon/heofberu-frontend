import { useEffect, useRef, useState } from 'react'
import { Tag } from './StepShell.jsx'

const LIFETIME = 6000
const TICK = 100

export default function RollToasts({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  const [remaining, setRemaining] = useState(LIFETIME)
  const [paused, setPaused] = useState(false)
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false,
  )

  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - TICK
        if (next <= 0) {
          clearInterval(id)
          onDismissRef.current(toast.id)
          return 0
        }
        return next
      })
    }, TICK)
    return () => clearInterval(id)
  }, [paused, toast.id])

  const dice = toast.dice ?? []
  const dropIndex = dice.length === 4 ? dice.indexOf(Math.min(...dice)) : -1
  const opacity = paused || reduceMotion ? 1 : remaining / LIFETIME

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ opacity, transition: reduceMotion ? 'none' : 'opacity 120ms linear' }}
      className="pointer-events-auto rounded-lg border border-stone-600 bg-stone-900/95 p-3 shadow-lg shadow-black/40 transition hover:border-ember/60 hover:bg-stone-900"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-stone-100">{toast.title}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-xs text-stone-500 hover:text-stone-300"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {dice.map((d, i) => (
          <span
            key={i}
            className={`flex size-6 items-center justify-center rounded bg-stone-700 font-mono text-xs text-stone-100 ${
              i === dropIndex ? 'text-stone-500 line-through' : ''
            }`}
          >
            {d}
          </span>
        ))}
        {toast.total != null && <Tag tone="accent">= {toast.total}</Tag>}
      </div>
    </div>
  )
}
