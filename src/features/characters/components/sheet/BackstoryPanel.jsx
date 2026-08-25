import { EditableBlock } from '@/components/sheet/primitives.jsx'

export default function BackstoryPanel({ character, onSave }) {
  return (
    <EditableBlock title="Предыстория" value={character.backstory} rows={12} onSave={onSave('backstory')} />
  )
}
