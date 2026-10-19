import { EditableBlock } from '@/components/sheet/primitives.jsx'
import { PLAYER_SECRET_HINT, PLAYER_SECRET_TOOL, renderPlayerSecrets } from './playerSecrets.jsx'

const FIELDS = [
  ['personality_traits', 'Черты характера'],
  ['ideals', 'Идеалы'],
  ['bonds', 'Привязанности'],
  ['flaws', 'Слабости'],
]

// Без onSave — только чтение (публичный лист героя). Блоки «Только для игрока и мастера» — в рамке, публичная
// карточка их не получает.
export default function PersonalityPanel({ character, onSave }) {
  return (
    <div className="space-y-2">
      {FIELDS.map(([field, title]) => (
        <EditableBlock key={field} title={title} value={character[field]} rows={3} onSave={onSave?.(field)} extraTools={[PLAYER_SECRET_TOOL]} renderValue={renderPlayerSecrets} hint={PLAYER_SECRET_HINT} />
      ))}
    </div>
  )
}
