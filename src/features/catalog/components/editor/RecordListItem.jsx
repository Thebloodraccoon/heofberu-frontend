import { Badge } from '@/components/ui'

export default function RecordListItem({ item, selectedId, badges, onEdit }) {
  return (
    <div
      className={`card-hover fantasy-panel cursor-pointer rounded-lg p-3 transition ${
        selectedId === item.id
          ? 'border-ember/80 bg-stone-900'
          : 'hover:border-ember/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-display text-sm font-bold ${selectedId === item.id ? 'text-ember' : 'text-stone-100'}`}>{item.name}</p>
          </div>
          {badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {badges.map((b, i) => (
                <Badge key={i} tone={b.tone}>
                  {b.text}
                </Badge>
              ))}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="shrink-0 rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
        >
          Изменить
        </button>
      </div>

    </div>
  )
}
