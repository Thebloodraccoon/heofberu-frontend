import { EditableBlock } from '@/components/sheet/primitives.jsx'

const FIELDS = [
  ['personality_traits', 'Черты характера'],
  ['ideals', 'Идеалы'],
  ['bonds', 'Привязанности'],
  ['flaws', 'Слабости'],
]

export default function PersonalityPanel({ character, onSave }) {
  return (
    <div className="space-y-2">
      {FIELDS.map(([field, title]) => (
        <EditableBlock key={field} title={title} value={character[field]} rows={3} onSave={onSave(field)} />
      ))}
    </div>
  )
}
