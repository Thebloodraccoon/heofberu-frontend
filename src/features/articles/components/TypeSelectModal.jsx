import { useEffect, useState } from 'react'
import { ARTICLE_TYPES } from '@/features/articles/api.js'
import { Button, Modal } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

const chip = (active) =>
  `rounded-full border px-3 py-1.5 text-sm transition ${
    active
      ? 'border-ember bg-ember/20 text-stone-100'
      : 'border-stone-700 text-stone-300 hover:border-stone-500 hover:bg-stone-800'
  }`

// Выбор типов статей для фильтра лора: черновик применяется кнопкой, «Отмена»/Esc ничего не меняют.
export default function TypeSelectModal({ selected, onApply, onClose }) {
  const [draft, setDraft] = useState(selected)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (t) => setDraft((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]))

  return (
    <Modal
      title="Типы статей"
      subtitle="Покажем статьи любого из отмеченных типов."
      size="2xl"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="mr-auto text-sm text-stone-400 hover:text-stone-200 max-sm:mr-0"
            onClick={() => setDraft([])}
          >
            Все типы
          </button>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={() => onApply(ARTICLE_TYPES.filter((t) => draft.includes(t)))}>Применить</Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {ARTICLE_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={draft.includes(t)} className={chip(draft.includes(t))} onClick={() => toggle(t)}>
            {articleTypeLabels[t]}
          </button>
        ))}
      </div>
    </Modal>
  )
}
