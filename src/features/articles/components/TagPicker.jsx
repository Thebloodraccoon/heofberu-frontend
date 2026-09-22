import { useState } from 'react'
import { useCreateTag, useTags } from '@/features/articles/queries.js'
import { Button, ErrorBox, Input } from '@/components/ui'

// Выбор тегов из общего словаря + создание нового (POST /tags, только ГМ).
export default function TagPicker({ value, onChange }) {
  const tagsQ = useTags()
  const createTag = useCreateTag()
  const [name, setName] = useState('')

  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const tag = await createTag.mutateAsync(trimmed).catch(() => null)
    if (tag) {
      onChange([...value, tag.id])
      setName('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(tagsQ.data ?? []).map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={value.includes(t.id)}
            onClick={() => toggle(t.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
              value.includes(t.id) ? 'border-ember bg-ember/20 text-stone-100' : 'border-stone-600 text-stone-400 hover:bg-stone-800'
            }`}
          >
            {t.name}
          </button>
        ))}
        {tagsQ.data?.length === 0 && <span className="text-sm text-stone-500">Тегов пока нет.</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Новый тег"
        />
        <Button variant="ghost" disabled={!name.trim() || createTag.isPending} onClick={add}>
          Добавить
        </Button>
      </div>
      {createTag.error && <ErrorBox error={createTag.error} onRetry={() => createTag.reset()} />}
    </div>
  )
}
