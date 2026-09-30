import { useState } from 'react'
import { useArticleSubtypes, useCreateSubtype } from '@/features/articles/queries.js'
import { Button, ErrorBox, Input, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { articleTypeLabels } from '@/lib/i18n'
import LoreIcon from './LoreIcon.jsx'

// Подтип статьи — как теги: чип с «✕» и кнопка, открывающая панель со словарём подтипов
// текущего типа (поиск, создание нового). Подтип один, поэтому выбор сразу применяется.
// value — id подтипа или null; onChange(id | null).
export default function SubtypeSelect({ articleType, value, onChange, disabled = false }) {
  const subtypesQ = useArticleSubtypes(articleType)
  const [open, setOpen] = useState(false)
  const current = (subtypesQ.data ?? []).find((s) => s.id === value)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-sub">Подтип</h3>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
          {value ? 'Изменить подтип' : 'Выбрать подтип'}
        </Button>
      </div>
      {value == null ? (
        <p className="text-sm text-stone-500">Без подтипа.</p>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-stone-600 bg-stone-800/60 py-1 pl-3 pr-1 text-sm text-stone-100">
          {current?.name ?? '…'}
          <button
            type="button"
            aria-label={`Убрать подтип ${current?.name ?? ''}`.trim()}
            title="Убрать подтип"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="rounded-full px-1.5 text-stone-400 transition hover:bg-stone-700 hover:text-stone-100"
          >
            <LoreIcon name="close" />
          </button>
        </span>
      )}
      {open && (
        <SubtypePicker
          articleType={articleType}
          subtypesQ={subtypesQ}
          value={value}
          onClose={() => setOpen(false)}
          onPick={(id) => {
            onChange(id)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function SubtypePicker({ articleType, subtypesQ, value, onPick, onClose }) {
  const [search, setSearch] = useState('')
  const createSubtype = useCreateSubtype()
  const term = search.trim()
  const items = (subtypesQ.data ?? []).filter((s) => s.name.toLowerCase().includes(term.toLowerCase()))
  const exact = items.find((s) => s.name.toLowerCase() === term.toLowerCase())

  const create = async () => {
    const created = await createSubtype.mutateAsync({ articleType, name: term }).catch(() => null)
    if (created) onPick(created.id)
  }

  const onSearchKey = (e) => {
    if (e.key !== 'Enter' || !term) return
    e.preventDefault()
    if (exact) onPick(exact.id)
    else create()
  }

  return (
    <Drawer
      title="Подтип статьи"
      subtitle={`Подтипы типа «${articleTypeLabels[articleType] ?? articleType}»: выберите или создайте новый.`}
      closeLabel="Закрыть подтипы"
      onClose={onClose}
    >
      <div className="space-y-5">
        <Input
          autoFocus
          className="input-search w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchKey}
          maxLength={50}
          placeholder="Найти или создать подтип…"
          aria-label="Поиск подтипов"
        />
        {term && !exact && (
          <button
            type="button"
            disabled={createSubtype.isPending}
            onClick={create}
            className="w-full rounded border border-dashed border-ember/60 px-3 py-2 text-left text-sm text-ember transition hover:bg-ember/10"
          >
            + Создать подтип «{term}»
          </button>
        )}
        {createSubtype.error && <ErrorBox error={createSubtype.error} onRetry={() => createSubtype.reset()} />}
        {subtypesQ.isLoading && <Skeleton className="h-24 w-full" />}
        {subtypesQ.error && <ErrorBox error={subtypesQ.error} onRetry={subtypesQ.refetch} />}
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === value}
              className={`lore-chip ${s.id === value ? 'lore-chip--active' : ''}`}
              onClick={() => onPick(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        {subtypesQ.data && items.length === 0 && (
          <p className="text-sm text-stone-500">{term ? 'Таких подтипов нет.' : 'Подтипов пока нет.'}</p>
        )}
      </div>
    </Drawer>
  )
}
