import { TextBlock } from '@/components/sheet/primitives.jsx'

export default function PersonalityPanel({ character, editing, onSave }) {
  return (
    <div className="space-y-3">
      <TextBlock title="Черты характера" value={character.personality_traits} editing={editing} onSave={onSave('personality_traits')} />
      <TextBlock title="Идеалы" value={character.ideals} editing={editing} onSave={onSave('ideals')} />
      <TextBlock title="Привязанности" value={character.bonds} editing={editing} onSave={onSave('bonds')} />
      <TextBlock title="Слабости" value={character.flaws} editing={editing} onSave={onSave('flaws')} />
    </div>
  )
}
