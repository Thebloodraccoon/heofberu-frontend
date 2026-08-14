import { useMemo, useState } from 'react'
import { Button, Input } from './ui.jsx'
import { label } from '../labels.js'

export default function ItemPickerModal({ title = 'Стартовое снаряжение', items = [], value = [], onSave, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => {
    const map = {}
    for (const it of value ?? []) {
      if (it.item_id != null) map[String(it.item_id)] = { item_id: it.item_id, quantity: it.quantity ?? 1 }
    }
    return map
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (it) =>
        (it.name ?? '').toLowerCase().includes(q) ||
        (it.description ?? '').toLowerCase().includes(q) ||
        label(it.item_type).toLowerCase().includes(q)
    )
  }, [items, query])

  const toggle = (it) => {
    const id = String(it.id)
    setSelected((s) => {
      const next = { ...s }
      if (next[id]) delete next[id]
      else next[id] = { item_id: it.id, quantity: 1 }
      return next
    })
  }

  const setQuantity = (id, v) =>
    setSelected((s) => ({ ...s, [id]: { ...s[id], quantity: Number(v) || 1 } }))

  const count = Object.keys(selected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg bg-stone-900 shadow-2xl ring-1 ring-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-700/70 p-5">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-100">{title}</h2>
            <p className="mt-0.5 text-sm text-stone-400">Выберите предметы и укажите количество</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        <div className="p-5 pb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск: имя, описание..."
            autoFocus
          />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-stone-500">Предметов не найдено</p>
          ) : (
            filtered.map((it) => {
              const id = String(it.id)
              const sel = selected[id]
              return (
                <div
                  key={it.id}
                  className={`rounded-lg border p-3 ${
                    sel ? 'border-ember/60 bg-ember/5' : 'border-stone-700/60 bg-stone-900/60'
                  }`}
                >
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!!sel}
                      onChange={() => toggle(it)}
                      className="size-4 accent-ember"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${sel ? 'text-ember' : 'text-stone-100'}`}>
                        {it.name}
                      </span>
                      {it.item_type && (
                        <span className="block text-xs text-stone-400">{label(it.item_type)}</span>
                      )}
                    </span>
                    {sel && (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={sel.quantity}
                          onChange={(e) => setQuantity(id, e.target.value)}
                          className="w-20 rounded border border-stone-700 bg-stone-800/70 px-2 py-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
                        />
                        <span className="text-xs text-stone-400">шт.</span>
                      </span>
                    )}
                  </label>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-stone-700/70 p-4">
          <span className="text-sm text-stone-400">Выбрано: {count}</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" onClick={() => onSave(Object.values(selected))}>
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
