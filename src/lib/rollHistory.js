const KEY = 'heofberu-roll-history'
const CAP = 100

export function loadRollHistory() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(rolls) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rolls.slice(0, CAP)))
  } catch {
    /* localStorage недоступен */
  }
}

export function recordRoll(entry) {
  const rolls = loadRollHistory()
  persist([{ ...entry, pinned: false }, ...rolls])
}

export function clearRollHistory() {
  persist(loadRollHistory().filter((r) => r.pinned))
}

export function togglePinRoll(id) {
  persist(loadRollHistory().map((r) => (r.id === id ? { ...r, pinned: !r.pinned } : r)))
}
