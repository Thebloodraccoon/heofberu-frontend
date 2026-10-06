import { Badge } from '@/components/ui'

export default function RecordListItem({ item, selectedId, badges, onEdit }) {
  const selected = selectedId === item.id
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-pressed={selected}
      data-active={selected}
      className={`editor-record-card ${selected ? 'is-active' : ''}`}
    >
      <div className="editor-record-heading">
        <span className="editor-record-title">{item.name}</span>
      </div>
      {badges.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.map((badge, i) => <Badge key={i} tone={badge.tone}>{badge.text}</Badge>)}
        </div>
      )}
    </button>
  )
}
