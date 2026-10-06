import { useState } from 'react'
import Drawer from '@/components/ui/Drawer.jsx'
import { Button, Input } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

export default function ProficiencyPicker({ title, options, onPick, disabled, addLabel }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const choice = options.find((option) => option.key === selected && !option.disabled)
  const close = () => { if (!busy) setOpen(false) }
  const confirm = async () => {
    if (!choice || busy) return
    setBusy(true)
    try {
      await onPick(choice.key)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return <>
    <Button size="sm" variant="ghost" disabled={disabled} onClick={() => { setQuery(''); setSelected(null); setOpen(true) }}>
      <LoreIcon name="plus" />{addLabel}
    </Button>
    {open && <Drawer title={title} onClose={close} closeLabel="Закрыть выбор владения" bodyClassName="grant-picker-body" footer={
      <div className="article-filter-actions">
        <Button variant="ghost" disabled={busy} onClick={close}>Отмена</Button>
        <Button disabled={!choice || busy} onClick={confirm}>{busy ? 'Добавляем…' : 'Добавить'}</Button>
      </div>
    }>
      <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск…" aria-label="Поиск владения" className="mb-3 w-full" />
      <div className="grant-picker-list space-y-2 pr-1">
        {options.filter((option) => option.label.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))).map((option) =>
          <button key={option.key} type="button" disabled={option.disabled || busy} aria-pressed={selected === option.key} onClick={() => setSelected(option.key)} className={`catalog-record-card w-full p-3 text-left disabled:opacity-50 ${selected === option.key ? 'catalog-record-card--selected' : ''}`}>
            <span className="flex items-center justify-between gap-2"><span>{option.label}</span>{(option.disabled || selected === option.key) && <LoreIcon name="check" />}</span>
            {option.disabled && <span className="text-xs text-stone-500">Уже есть владение</span>}
          </button>,
        )}
        {!options.some((option) => option.label.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))) && <p className="py-4 text-center text-sm text-stone-500">Ничего не найдено.</p>}
      </div>
    </Drawer>}
  </>
}
