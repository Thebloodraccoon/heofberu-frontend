import { useState } from 'react'
import { clearRollHistory, loadRollHistory, togglePinRoll } from '@/lib/rollHistory.js'
import { Modal } from '@/components/ui'

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const PinIcon = ({ filled = false }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
)

const fmtTime = (ts) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function RollHistory() {
  const [open, setOpen] = useState(false)
  const [rolls, setRolls] = useState([])

  const openModal = () => {
    setRolls(loadRollHistory())
    setOpen(true)
  }

  const sorted = [...rolls].sort(
    (a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false) || b.at - a.at,
  )

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="grid size-10 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-stone-300 transition hover:border-ember hover:text-ember"
        title="История бросков"
      >
        <ClockIcon />
      </button>

      {open && (
        <Modal title="История бросков" onClose={() => setOpen(false)} size="lg">
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">Бросков пока нет</p>
          ) : (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {sorted.map((r) => (
                <li
                  key={r.id}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    r.pinned ? 'border border-gold/40 bg-stone-800/80' : 'bg-stone-800/40'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-stone-200">{r.title}</span>
                    {r.detail && <span className="block truncate text-xs text-stone-500">{r.detail}</span>}
                  </span>
                  <span className="w-10 shrink-0 text-right font-mono text-xs text-stone-500">
                    {fmtTime(r.at)}
                  </span>
                  <span className="w-14 shrink-0 rounded bg-ember py-0.5 text-center font-mono text-sm font-bold text-white">
                    {r.total}
                  </span>
                  <span className="flex w-8 shrink-0 justify-end">
                    <button
                      type="button"
                      className={`rounded p-1.5 transition ${
                        r.pinned
                          ? 'text-gold'
                          : 'text-stone-600 opacity-0 group-hover:opacity-100 hover:text-stone-300'
                      }`}
                      title={r.pinned ? 'Открепить' : 'Закрепить'}
                      onClick={() => {
                        togglePinRoll(r.id)
                        setRolls(loadRollHistory())
                      }}
                    >
                      <PinIcon filled={!!r.pinned} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {sorted.some((r) => !r.pinned) && (
            <div className="mt-4 flex justify-end border-t border-stone-700 pt-3">
              <button
                type="button"
                className="sheet-btn !py-1.5 text-xs"
                onClick={() => {
                  clearRollHistory()
                  setRolls(loadRollHistory())
                }}
              >
                Очистить (кроме закреплённых)
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
