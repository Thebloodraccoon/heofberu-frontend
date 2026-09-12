import { useEffect, useRef, useState } from 'react'

const LIFETIME = 3000
const TICK = 100

/**
 * Small toast stack for status confirmations (autosave, save results) —
 * same look and auto-dismiss behaviour as the dice-roll toasts.
 */
export default function StatusToasts({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <StatusToast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function StatusToast({ toast, onDismiss }) {
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
      setRemaining((r) => Math.max(0, r - TICK))
    }, TICK)
    return () => clearInterval(id)
  }, [paused, toast.id])

  useEffect(() => {
    if (remaining <= 0) {
      onDismissRef.current(toast.id)
    }
  }, [remaining, toast.id])

  const opacity = paused || reduceMotion ? 1 : remaining / LIFETIME
  const cardBorder = {
    saving: 'border-ember/70 hover:border-ember/60',
    success: 'border-emerald-700/70 hover:border-emerald-600/70',
    error: 'border-red-800/70 hover:border-red-700/70',
  }
  const footerTag = {
    saving: { cls: 'bg-ember', icon: '…', text: 'Сохраняем…' },
    success: { cls: 'bg-emerald-700', icon: '✓', text: 'Сохранено' },
    error: { cls: 'bg-red-800', icon: '✕', text: 'Ошибка' },
  }
  const tone = toast.tone === 'error' || toast.tone === 'saving' ? toast.tone : 'success'
  const tag = footerTag[tone]

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ opacity, transition: reduceMotion ? 'none' : 'opacity 120ms linear' }}
      className={`pointer-events-auto rounded-lg border bg-stone-900/95 p-3 shadow-lg shadow-black/40 transition hover:bg-stone-900 ${
        cardBorder[tone]
      }`}
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
      {toast.detail && <p className="mt-1 text-xs text-stone-400">{toast.detail}</p>}
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${tag.cls}`}>
          {tag.icon} {tag.text}
        </span>
      </div>
    </div>
  )
}