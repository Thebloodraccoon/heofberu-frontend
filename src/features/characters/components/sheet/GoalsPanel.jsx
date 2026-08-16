import { TextBlock } from '@/components/sheet/primitives.jsx'

export default function GoalsPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="История и цели" value={character.backstory} editing={editing} onSave={onSave('backstory')} />
    </div>
  )
}
