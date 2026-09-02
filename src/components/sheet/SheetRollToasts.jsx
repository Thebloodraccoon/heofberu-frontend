import { useEffect, useRef, useState } from 'react'

const LIFETIME = 6000
const TICK = 100

/**
 * Toast stack for dice rolls on the character sheet — same look and
 * lifetime behaviour as the creation wizard's RollToasts.
 */
export default function SheetRollToasts({ toasts, onDismiss }) {
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
        return next <= 0 ? 0 : next
      })
    }, TICK)
    return () => clearInterval(id)
  }, [paused, toast.id])

  // Скрываем тост, когда таймер дожил до нуля. Вызов onDismiss вынесен из
  // апдейтера setRemaining, чтобы не мутировать родительское состояние
  // во время рендера другого компонента.
  useEffect(() => {
    if (remaining <= 0) {
      onDismissRef.current(toast.id)
    }
  }, [remaining, toast.id])

  const opacity = paused || reduceMotion ? 1 : remaining / LIFETIME
  const rolls = Array.isArray(toast.rolls) ? toast.rolls : null
  const isNat20 = !rolls && toast.d20 === 20
  const isNat1 = !rolls && toast.d20 === 1

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
        {rolls ? (
          <>
            {rolls.map((r, i) => (
              <span
                key={i}
                className={`flex size-6 items-center justify-center rounded font-mono text-xs ${
                  r === 1 ? 'bg-red-800/60 text-red-200' : 'bg-stone-700 text-stone-100'
                }`}
              >
                {r}
              </span>
            ))}
            <span className="w-[8ch] rounded bg-ember px-1.5 py-0.5 text-center font-mono text-xs font-bold text-white">
              = {toast.total}
            </span>
          </>
        ) : (
          <>
            <span
              className={`flex size-6 items-center justify-center rounded font-mono text-xs ${
                isNat20
                  ? 'bg-emerald-700/60 text-emerald-200'
                  : isNat1
                    ? 'bg-red-800/60 text-red-200'
                    : 'bg-stone-700 text-stone-100'
              }`}
            >
              {toast.d20}
            </span>
            {toast.bonus ? <span className="text-xs text-stone-500">+{toast.bonus}</span> : null}
            <span className="w-[8ch] rounded bg-ember px-1.5 py-0.5 text-center font-mono text-xs font-bold text-white">
              = {toast.total}
            </span>
            {isNat20 && <span className="text-xs text-emerald-300">крит!</span>}
            {isNat1 && <span className="text-xs text-red-300">провал</span>}
          </>
        )}
      </div>
    </div>
  )
}
