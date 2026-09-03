import { useState } from 'react'
import { skillLabels, sentenceCase } from '@/lib/i18n/index.js'
import { Button, Modal, Skeleton } from '@/components/ui'
import { useSubclassesForClass, useSubclassDetail } from '@/features/catalog/queries.js'

function SubclassDetail({ classId, subclassId }) {
  const { data: detail, isLoading } = useSubclassDetail(classId, subclassId || null)
  if (isLoading) {
    return (
      <div className="px-1 pt-2 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    )
  }
  if (!detail) return null

  const skills = (detail.granted_skills ?? []).map((s) => {
    const n = s.name ?? s.item?.name ?? s
    return { id: s.id ?? s.item_id, name: skillLabels[n] ?? sentenceCase(n) }
  })

  return (
    <div className="mt-2 space-y-4 border-t border-stone-800 px-[15px] pt-2 pb-2">
      {detail.description && (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-400">{detail.description}</p>
      )}
      {skills.length > 0 && (
        <p className="text-xs text-stone-400">
          <span className="font-medium text-stone-300">Навыки: </span>
          {skills.map((s) => s.name).join(', ')}
        </p>
      )}
      {(detail.features ?? []).length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Особенности</p>
          {detail.features.map((f) => (
            <div key={f.id} className="rounded border border-stone-700/50 bg-stone-900/40 px-2 py-1.5">
              <p className="text-xs font-medium text-stone-200">{f.name}</p>
              {f.description && (
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-stone-400">{f.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SubclassPickerModal({ character, currentId, onPick, onClose }) {
  const subclassesQ = useSubclassesForClass(character.class_id)
  const subclasses = subclassesQ.data ?? []
  const items = [{ id: '', name: 'Без подкласса' }, ...subclasses]
  const [selected, setSelected] = useState(currentId ?? '')
  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(String(id))) next.delete(String(id))
      else next.add(String(id))
      return next
    })

  return (
    <Modal title="Выбор подкласса" onClose={onClose} size="lg" scroll>
      <p className="mb-3 text-sm text-stone-400">
        Подкласс раскрывает специализацию класса персонажа и даёт свои способности.
      </p>

      <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
        {items.map((it) => {
          const active = String(it.id) === String(selected)
          const isOpen = expanded.has(String(it.id))
          return (
            <div
              key={String(it.id)}
              className={`rounded-lg border transition ${
                active ? 'border-ember/80 bg-ember/10' : isOpen ? 'border-stone-600 bg-stone-800/60' : 'border-stone-700/50 bg-stone-800/40'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSelected(it.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="text-sm font-medium text-stone-100">{it.name}</span>
                </button>
                {it.id !== '' && (
                  <button
                    type="button"
                    onClick={() => toggle(it.id)}
                    className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 transition hover:text-stone-100"
                    title={isOpen ? 'Свернуть' : 'Подробнее'}
                    aria-expanded={isOpen}
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              {isOpen && it.id !== '' && <SubclassDetail classId={character.class_id} subclassId={it.id} />}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={() => onPick(selected || null)}>Применить</Button>
      </div>
    </Modal>
  )
}
