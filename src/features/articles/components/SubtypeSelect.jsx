import { useState } from 'react'
import { useArticleSubtypes, useCreateSubtype, useDeleteSubtype, useRenameSubtype } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { Button, ConfirmDialog, ErrorBox, Input, Skeleton } from '@/components/ui'
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
  // Удалённый подтип бэк сам снимает со статей — показываем «без подтипа», не отправляя PATCH.
  const gone = value != null && subtypesQ.data && !current

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-sub">Подтип</h3>
        <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
          {value && !gone ? 'Изменить подтип' : 'Выбрать подтип'}
        </Button>
      </div>
      {value == null || gone ? (
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

// Правка словаря: переименовать может любой ГМ, удалить — только основатель
// (статьи с удалённым подтипом остаются без подтипа).
function SubtypeRow({ subtype, canDelete }) {
  const rename = useRenameSubtype()
  const remove = useDeleteSubtype()
  const [name, setName] = useState(subtype.name)
  const [confirm, setConfirm] = useState(false)
  const next = name.trim()
  const changed = next && next !== subtype.name

  const save = (e) => {
    e.preventDefault()
    if (changed) rename.mutate({ id: subtype.id, name: next })
  }

  return (
    <li>
      <form onSubmit={save} className="flex items-center gap-2">
        <Input value={name} maxLength={50} onChange={(e) => { rename.reset(); setName(e.target.value) }} aria-label={`Название подтипа ${subtype.name}`} className="flex-1" />
        {changed && <Button type="submit" size="sm" disabled={rename.isPending}>{rename.isPending ? '...' : 'Сохранить'}</Button>}
        {canDelete && <Button type="button" size="sm" variant="danger" onClick={() => setConfirm(true)}>Удалить</Button>}
      </form>
      {rename.error && <ErrorBox className="mt-1" error={rename.error} />}
      {confirm && (
        <ConfirmDialog
          title={`Удалить подтип «${subtype.name}»?`}
          message="Статьи с этим подтипом останутся без подтипа."
          busy={remove.isPending}
          error={remove.error}
          onCancel={() => { remove.reset(); setConfirm(false) }}
          onConfirm={() => remove.mutate(subtype.id, { onSuccess: () => setConfirm(false) })}
        />
      )}
    </li>
  )
}

function SubtypePicker({ articleType, subtypesQ, value, onPick, onClose }) {
  const { isFounder } = useAuth()
  const [manage, setManage] = useState(false)
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
        {subtypesQ.data?.length > 0 && (
          <Button size="sm" variant="ghost" aria-pressed={manage} onClick={() => setManage((v) => !v)}>
            {manage ? 'Готово' : 'Править словарь'}
          </Button>
        )}
        {manage ? (
          <ul className="space-y-2">
            {items.map((s) => <SubtypeRow key={s.id} subtype={s} canDelete={isFounder} />)}
          </ul>
        ) : (
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
        )}
        {subtypesQ.data && items.length === 0 && (
          <p className="text-sm text-stone-500">{term ? 'Таких подтипов нет.' : 'Подтипов пока нет.'}</p>
        )}
      </div>
    </Drawer>
  )
}
