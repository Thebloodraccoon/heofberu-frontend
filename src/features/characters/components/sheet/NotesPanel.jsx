import { TextBlock } from '@/components/sheet/primitives.jsx'

export default function NotesPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="Заметки" value={character.notes} editing={editing} onSave={onSave('notes')} />
    </div>
  )
}
