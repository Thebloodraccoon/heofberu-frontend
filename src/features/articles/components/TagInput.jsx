import { useState } from 'react'
import TagSelectModal from '@/features/articles/components/TagSelectModal.jsx'
import { Button } from '@/components/ui'

// Теги статьи в конструкторе ГМ — как связи: список чипов с «✕» и кнопка
// «Добавить теги», открывающая модалку со словарём (поиск, создание нового тега).
// value/onChange — массив { id, name }.
export default function TagInput({ value, onChange }) {
  const [modal, setModal] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-sub">Теги</h3>
        <Button size="sm" variant="ghost" onClick={() => setModal(true)}>
          Добавить теги
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-stone-500">Тегов пока нет.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border border-stone-600 bg-stone-800/60 py-1 pl-3 pr-1 text-sm text-stone-100"
            >
              #{t.name}
              <button
                type="button"
                aria-label={`Удалить тег ${t.name}`}
                title="Удалить тег"
                onClick={() => onChange(value.filter((x) => x.id !== t.id))}
                className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {modal && (
        <TagSelectModal
          title="Теги статьи"
          subtitle="Выберите из словаря или создайте новый."
          selected={value}
          allowCreate
          applyText="Готово"
          onClose={() => setModal(false)}
          onApply={(tags) => {
            onChange(tags)
            setModal(false)
          }}
        />
      )}
    </div>
  )
}
