import { EditableBlock } from '@/components/sheet/primitives.jsx'

export default function NotesPanel({ character, onSave }) {
  return (
    <EditableBlock title="Заметки" value={character.notes} rows={10} onSave={onSave('notes')} />
  )
}
