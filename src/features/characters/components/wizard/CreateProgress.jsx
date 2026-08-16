export default function CreateProgress({ current, target }) {
  const pct = target > 1 ? Math.round(((current - 1) / (target - 1)) * 100) : 100

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="fantasy-panel w-full max-w-sm rounded-lg p-6 text-center">
        <div className="mx-auto size-10 animate-spin rounded-full border-2 border-ember border-t-transparent" />
        <h3 className="mt-4 font-display text-lg font-bold text-stone-100">Создаём персонажа…</h3>
        <p className="mt-1 text-sm text-stone-400">
          Уровень {current} из {target}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-800">
          <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
