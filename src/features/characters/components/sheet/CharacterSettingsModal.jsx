import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi as api } from '@/features/characters/api.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { useBackgroundDetail, useSubclassesForClass, useSubracesForRace } from '@/features/catalog/queries.js'
import { Button, Input, Modal } from '@/components/ui'
import BackgroundPickerModal from './BackgroundPickerModal.jsx'
import SubracePickerModal from './SubracePickerModal.jsx'
import SubclassPickerModal from './SubclassPickerModal.jsx'

function Tile({ title, present, currentName, onClick, editable = true }) {
  const body = (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-sm text-stone-200">{title}</span>
      {present ? (
        <div className="flex min-w-0 items-center gap-2">
          {currentName && <span className="truncate text-sm text-stone-400">{currentName}</span>}
          {editable && <span className="shrink-0 text-xs font-medium text-ember">Изменить</span>}
        </div>
      ) : (
        <span className="shrink-0 text-xs font-medium text-ember">{editable ? 'Добавить' : '—'}</span>
      )}
    </div>
  )

  const baseClass = 'w-full rounded-lg border border-stone-700/50 bg-stone-900/40 p-3 text-left'
  if (!editable) {
    return <div className={`${baseClass} cursor-default`}>{body}</div>
  }
  return (
    <button type="button" onClick={onClick} className={`${baseClass} transition hover:border-ember/70`}>
      {body}
    </button>
  )
}

export default function CharacterSettingsModal({ character, onClose, onError }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(character.name || '')
  const [saving, setSaving] = useState(false)
  const [savingSection, setSavingSection] = useState(false)
  const [picking, setPicking] = useState(null)

  const { data: currentBg } = useBackgroundDetail(character.background_id)
  const subracesQ = useSubracesForRace(character.race_id)
  const subclassesQ = useSubclassesForClass(character.class_id)
  const currentSub = subracesQ.data?.find((s) => String(s.id) === String(character.subrace_id))
  const currentSubclass = subclassesQ.data?.find((s) => String(s.id) === String(character.subclass_id))

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
  }

  const saveName = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.update(character.id, { name: name.trim() })
      await refresh()
      onClose()
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  const applyProgression = async (kind, payload) => {
    if (savingSection) return
    setSavingSection(true)
    try {
      await api.progression[kind](character.id, payload)
      await refresh()
    } catch (e) {
      onError(e)
    } finally {
      setSavingSection(false)
    }
  }

  return (
    <Modal title="Настройки персонажа" onClose={onClose} size="lg">
      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-sm text-stone-300">
          Имя
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя персонажа" />
        </label>

        <Tile
          title="Подраса"
          present={!!character.subrace_id}
          currentName={currentSub?.name}
          onClick={() => setPicking('subrace')}
        />
        <Tile
          title="Подкласс"
          present={!!character.subclass_id}
          currentName={currentSubclass?.name}
          onClick={() => setPicking('subclass')}
        />
        <Tile
          title="Предыстория"
          present={!!character.background_id}
          currentName={currentBg?.name}
          editable={!character.background_id}
          onClick={() => setPicking('background')}
        />

        {savingSection && <p className="text-xs text-stone-500">Сохранение…</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button disabled={!name.trim() || saving} onClick={saveName}>Сохранить имя</Button>
      </div>

      {picking === 'subrace' && (
        <SubracePickerModal
          character={character}
          currentId={character.subrace_id}
          onClose={() => setPicking(null)}
          onPick={async (id) => {
            await applyProgression('subrace', { subrace_id: id ? Number(id) : null })
            setPicking(null)
          }}
        />
      )}
      {picking === 'subclass' && (
        <SubclassPickerModal
          character={character}
          currentId={character.subclass_id}
          onClose={() => setPicking(null)}
          onPick={async (id) => {
            await applyProgression('subclass', { subclass_id: id ? Number(id) : null })
            setPicking(null)
          }}
        />
      )}
      {picking === 'background' && (
        <BackgroundPickerModal
          currentId={character.background_id}
          onClose={() => setPicking(null)}
          onPick={async (id) => {
            await applyProgression('background', { background_id: id ? Number(id) : null })
            setPicking(null)
          }}
        />
      )}
    </Modal>
  )
}
