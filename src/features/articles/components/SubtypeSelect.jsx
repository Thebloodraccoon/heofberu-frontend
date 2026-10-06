import { useState } from 'react'
import { useArticleSubtypes, useCreateSubtype, useDeleteSubtype, useRenameSubtype } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { Button, ConfirmDialog, ErrorBox, Input, Select, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { articleTypeLabels } from '@/lib/i18n'

// Выбор одного подтипа отделён от редактирования словаря текущего типа статьи.
export default function SubtypeSelect({ articleType, value, onChange, disabled = false }) {
  const subtypesQ = useArticleSubtypes(articleType)
  const [open, setOpen] = useState(false)
  const current = (subtypesQ.data ?? []).find((subtype) => String(subtype.id) === String(value))
  const loadingValue = value != null && !subtypesQ.data

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="article-editor-label">Подтип</h3>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>Словарь</Button>
    </div>
    <Select aria-label="Подтип статьи" className="w-full" value={current?.id ?? (loadingValue ? value : '')} disabled={disabled || subtypesQ.isLoading || Boolean(subtypesQ.error)} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}>
      <option value="">Без подтипа</option>
      {loadingValue && <option value={value}>Загрузка…</option>}
      {(subtypesQ.data ?? []).map((subtype) => <option key={subtype.id} value={subtype.id}>{subtype.name}</option>)}
    </Select>
    {subtypesQ.error && <ErrorBox error={subtypesQ.error} onRetry={subtypesQ.refetch} />}
    {open && <SubtypeDictionary articleType={articleType} subtypesQ={subtypesQ} onClose={() => setOpen(false)} />}
  </div>
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

function SubtypeDictionary({ articleType, subtypesQ, onClose }) {
  const { isFounder } = useAuth()
  const [search, setSearch] = useState('')
  const createSubtype = useCreateSubtype()
  const term = search.trim()
  const items = (subtypesQ.data ?? []).filter((s) => s.name.toLowerCase().includes(term.toLowerCase()))
  const exact = items.find((s) => s.name.toLowerCase() === term.toLowerCase())

  const create = async () => {
    const created = await createSubtype.mutateAsync({ articleType, name: term }).catch(() => null)
    if (created) setSearch('')
  }

  const onSearchKey = (e) => {
    if (e.key !== 'Enter' || !term) return
    e.preventDefault()
    if (!exact) create()
  }

  return (
    <Drawer
      title="Словарь подтипов"
      subtitle={`Подтипы типа «${articleTypeLabels[articleType] ?? articleType}»: добавляйте и редактируйте записи.`}
      closeLabel="Закрыть подтипы"
      onClose={onClose}
    >
      <div className="space-y-5">
        <Input
          autoFocus
          className="w-full px-4 py-2.5"
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
        <ul className="space-y-2">
          {items.map((subtype) => <SubtypeRow key={subtype.id} subtype={subtype} canDelete={isFounder} />)}
        </ul>
        {subtypesQ.data && items.length === 0 && (
          <p className="text-sm text-stone-500">{term ? 'Таких подтипов нет.' : 'Подтипов пока нет.'}</p>
        )}
      </div>
    </Drawer>
  )
}
