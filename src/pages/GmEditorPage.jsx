import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/endpoints.js'
import { editorConfig, syncFeatures, SPELL_LEVEL_KEYS } from '../editor.js'
import FeatureModal from '../components/FeaturesModal.jsx'
import SubclassModal from '../components/SubclassModal.jsx'
import { ruLevel } from '../labels.js'
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, PageHeader, Select, Spinner } from '../components/ui.jsx'

const inputClass =
  'w-full rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember'
const textareaClass = `${inputClass} min-h-24 resize-y leading-relaxed`

function SectionTitle({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{children}</p>
  )
}

function PillToggle({ options, selected, onToggle }) {
  return (
    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded border border-stone-700/60 bg-stone-900/50 p-3">
      {options.map((o) => {
        const active = selected.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              active ? 'bg-ember text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function EditorFieldControl({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        className={textareaClass}
      />
    )
  }
  if (field.type === 'number') {
    return <Input type="number" min={field.min} max={field.max} value={value} onChange={onChange} />
  }
  if (field.type === 'select') {
    return (
      <Select value={value} onChange={onChange}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    )
  }
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      required={field.required}
    />
  )
}

export default function GmEditorPage() {
  const [resource, setResource] = useState('races')
  const cfg = editorConfig[resource]

  const [records, setRecords] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')

  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

  const [featureModal, setFeatureModal] = useState(null)
  const [subclassModal, setSubclassModal] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [pills, setPills] = useState({ skills: [], classes: [], races: [] })

  const load = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let active = true
    cfg.api
      .list({ size: 100, ...(cfg.listParams ?? {}) })
      .then((page) => {
        if (!active) return
        setError(null)
        setRecords(page.items ?? [])
      })
      .catch((e) => {
        if (active) setError(e)
      })
    return () => {
      active = false
    }
  }, [cfg, reloadKey])

  const pillKeys = useMemo(() => {
    const keys = new Set()
    for (const section of cfg.sections ?? []) {
      if (section.type === 'pillsFrom' && section.listKey) keys.add(section.listKey)
    }
    return Array.from(keys)
  }, [cfg])

  useEffect(() => {
    let active = true
    const needed = pillKeys.filter((key) => key !== resource)
    if (needed.length === 0) return () => {}
    const apis = { skills: api.skills, classes: api.classes, races: api.races }
    Promise.all(
      needed.map((key) => apis[key].list({ size: 100 }).then((page) => page.items ?? []))
    )
      .then((arrays) => {
        if (!active) return
        const next = {}
        needed.forEach((key, i) => {
          next[key] = arrays[i]
        })
        setPills((prev) => ({ ...prev, ...next }))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [resource, pillKeys, reloadKey])

  const selectResource = (key) => {
    if (key === resource) return
    setResource(key)
    setQuery('')
    setError(null)
    setRecords(null)
    setShowForm(false)
    setEditing(null)
    setForm(null)
    setFeatureModal(null)
    setSubclassModal(null)
    setEditLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(cfg.emptyForm())
    setFeatureModal(null)
    setSubclassModal(null)
    setShowForm(true)
  }

  const openEdit = async (rec) => {
    setError(null)
    setFeatureModal(null)
    setSubclassModal(null)
    setEditLoading(true)
    setShowForm(true)
    try {
      const full = await cfg.api.get(rec.id)
      setEditing(full)
      setForm(cfg.fromRecord(full))
    } catch (e) {
      setError(e)
    } finally {
      setEditLoading(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(null)
    setFeatureModal(null)
    setSubclassModal(null)
    setEditLoading(false)
  }

  const filtered = useMemo(() => {
    if (!records) return null
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      const hay = [r.name, r.description ?? ''].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [records, query])

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))
  const toggleIn = (key) => (value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }))
  const setRow = (key, i, colKey, v) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, idx) => (idx === i ? { ...row, [colKey]: v } : row)),
    }))
  const addRow = (section) => {
    const selCol = section.columns?.find((c) => c.type === 'select')
    if (!selCol) {
      setForm((f) => ({ ...f, [section.key]: [...(f[section.key] ?? []), { ...section.defaults }] }))
      return
    }
    setForm((f) => {
      const rows = f[section.key] ?? []
      const used = new Set(rows.map((r) => r[selCol.key]))
      const free = (selCol?.options ?? []).find((o) => !used.has(o.value))
      if (!free) return f
      return { ...f, [section.key]: [...rows, { ...section.defaults, [selCol.key]: free.value }] }
    })
  }
  const removeRow = (key, i) =>
    setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }))
  const setSpellSlot = (key, classLevel, spellLevel, v) =>
    setForm((f) => {
      const slots = { ...(f[key]?.[classLevel] ?? {}) }
      slots[spellLevel] = v
      return { ...f, [key]: { ...(f[key] ?? {}), [classLevel]: slots } }
    })

  const listOptions = useMemo(() => {
    const toOptions = (arr) => arr.map((x) => ({ value: x.id, label: x.name }))
    const srcFor = (key) => (key === resource && records ? records : pills[key] ?? [])
    return {
      skills: toOptions(srcFor('skills')),
      classes: toOptions(srcFor('classes')),
      races: toOptions(srcFor('races')),
    }
  }, [pills, records, resource])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing && cfg.featuresSource) {
        await syncFeatures(form, editing.id, editing.features, cfg.featuresSource)
      }
      await cfg.submit(form, editing)
      closeForm()
      load()
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await cfg.api.remove(deleteTarget.id)
      if (editing?.id === deleteTarget.id) closeForm()
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Редактор справочников"
        subtitle="Создание, изменение и удаление записей всех справочников"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: имя, описание..."
              className="w-full rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember sm:w-64"
            />
            <Button onClick={openCreate}>+ Новая запись</Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {Object.entries(editorConfig).map(([key, c]) => {
          const active = key === resource
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectResource(key)}
              className={`flex shrink-0 items-center gap-2 rounded px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-ember text-white shadow-sm'
                  : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span className="font-display text-xs opacity-80">{c.icon}</span>
              {c.label}
            </button>
          )
        })}
      </div>

      {error && <ErrorBox error={error} onRetry={load} />}
      {!error && !records && <Spinner />}
      {!error && records && records.length > 0 && filtered.length === 0 && !showForm && (
        <EmptyState text="Ничего не найдено по запросу" />
      )}

      {!error && records && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {filtered.length > 0 && (
          <aside className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto pr-1 lg:sticky lg:top-24">
            {filtered.map((it) => (
              <div key={it.id} className="fantasy-panel rounded-lg p-3 transition hover:border-ember/50">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(it)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold text-stone-100">{it.name}</p>
                      {it.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
                    </div>
                    {cfg.listBadges(it).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cfg.listBadges(it).map((b, i) => (
                          <Badge key={i} tone={b.tone}>
                            {b.text}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(it)}
                      className="rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(it)}
                      className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </aside>
          )}

          <section className="min-w-0">
            {showForm && form ? (
              <Card className="p-5 sm:p-6">
                <div className="mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold text-stone-100">
                      {editing ? `Редактирование: ${editing.name}` : `Новая ${cfg.singular}`}
                    </h2>
                    {editing && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(editing)}
                        className="rounded border border-red-800 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-950/50"
                      >
                        Удалить...
                      </button>
                    )}
                  </div>
                  <div className="ornate-rule mt-3">
                    <span aria-hidden className="text-xs">
                      ✦
                    </span>
                  </div>
                </div>

                <form onSubmit={submit} className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {cfg.fields.map((field) => {
                      if (field.type === 'checkbox') {
                        return (
                          <div key={field.key} className="flex items-end">
                            <label className="flex w-full cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={!!form[field.key]}
                                onChange={setBool(field.key)}
                                className="size-4 accent-ember"
                              />
                              <span className="text-sm text-stone-200">{field.label}</span>
                            </label>
                          </div>
                        )
                      }
                      return (
                        <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                          <Field label={field.label}>
                            <EditorFieldControl
                              field={field}
                              value={form[field.key]}
                              onChange={setField(field.key)}
                            />
                          </Field>
                        </div>
                      )
                    })}
                  </div>

                  {cfg.sections
                    .filter((section) => {
                      if (editing && section.hiddenOnEdit) return false
                      if (section.showWhen && !section.showWhen(form)) return false
                      return true
                    })
                    .map((section) => {
                    if (section.type === 'spellSlots') {
                      return (
                        <div key={section.key}>
                          <div className="mb-2">
                            <SectionTitle>{section.label}</SectionTitle>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] border-collapse text-sm">
                              <thead>
                                <tr>
                                  <th className="w-10 border border-stone-700 bg-stone-900/50 px-2 py-1 text-left text-xs font-semibold text-stone-400">
                                    Ур.
                                  </th>
                                  <th className="border border-stone-700 bg-stone-900/50 px-2 py-1 text-xs font-semibold text-stone-400">
                                    Кантрип
                                  </th>
                                  {Array.from({ length: 9 }, (_, i) => (
                                    <th
                                      key={i}
                                      className="border border-stone-700 bg-stone-900/50 px-2 py-1 text-xs font-semibold text-stone-400"
                                    >
                                      {i + 1}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 20 }, (_, i) => {
                                  const classLevel = i + 1
                                  const row = form[section.key]?.[classLevel] ?? {}
                                  return (
                                    <tr key={classLevel}>
                                      <td className="border border-stone-700 px-2 py-1 text-xs text-stone-300">
                                        {classLevel}
                                      </td>
                                      <td className="border border-stone-700 p-1">
                                        <input
                                          type="number"
                                          min={0}
                                          max={9}
                                          value={row.CANTRIP ?? ''}
                                          onChange={(e) => setSpellSlot(section.key, classLevel, 'CANTRIP', e.target.value)}
                                          className="w-full rounded border border-stone-700 bg-stone-800/70 px-1 py-0.5 text-center text-sm text-stone-100 outline-none focus:border-ember"
                                        />
                                      </td>
                                      {SPELL_LEVEL_KEYS.slice(1).map((spellLevel) => (
                                        <td key={spellLevel} className="border border-stone-700 p-1">
                                          <input
                                            type="number"
                                            min={0}
                                            max={9}
                                            value={row[spellLevel] ?? ''}
                                            onChange={(e) => setSpellSlot(section.key, classLevel, spellLevel, e.target.value)}
                                            className="w-full rounded border border-stone-700 bg-stone-800/70 px-1 py-0.5 text-center text-sm text-stone-100 outline-none focus:border-ember"
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    }
                    if (section.type === 'rows') {
                      const selCol = section.columns?.find((c) => c.type === 'select')
                      const usedValues = selCol
                        ? new Set((form[section.key] ?? []).map((r) => r[selCol.key]))
                        : null
                      const allUsed = selCol
                        ? (selCol.options ?? []).every((o) => usedValues.has(o.value))
                        : false
                      return (
                        <div key={section.key}>
                          <div className="mb-2 flex items-center justify-between">
                            <SectionTitle>{section.label}</SectionTitle>
                            <button
                              type="button"
                              onClick={() => addRow(section)}
                              disabled={allUsed}
                              className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-40"
                            >
                              {section.addLabel}
                            </button>
                          </div>
                          {form[section.key].length === 0 && (
                            <p className="text-sm text-stone-500">{section.empty}</p>
                          )}
                          {allUsed && form[section.key].length > 0 && (
                            <p className="mb-2 text-xs text-stone-500">
                              Все характеристики использованы — каждая не может повторяться.
                            </p>
                          )}
                          <div className="flex flex-col gap-2">
                            {form[section.key].map((row, i) => (
                              <div key={i} className="flex items-center gap-2">
                                {section.columns.map((col) => {
                                  if (col.type === 'select') {
                                    return (
                                      <Select
                                        key={col.key}
                                        value={row[col.key]}
                                        onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                        className={`flex-1 ${col.width ?? ''}`}
                                      >
                                        {col.options.map((o) => (
                                          <option
                                            key={o.value}
                                            value={o.value}
                                            disabled={usedValues?.has(o.value) && o.value !== row[col.key]}
                                          >
                                            {o.label}
                                          </option>
                                        ))}
                                      </Select>
                                    )
                                  }
                                  if (col.type === 'textarea') {
                                    return (
                                      <textarea
                                        key={col.key}
                                        value={row[col.key] ?? ''}
                                        onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                        placeholder={col.placeholder}
                                        rows={col.rows ?? 2}
                                        className={`${inputClass} min-h-0 flex-1 ${col.width ?? ''}`}
                                      />
                                    )
                                  }
                                  if (col.type === 'text') {
                                    return (
                                      <Input
                                        key={col.key}
                                        type="text"
                                        value={row[col.key] ?? ''}
                                        onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                        placeholder={col.placeholder}
                                        className={`flex-1 ${col.width ?? ''}`}
                                      />
                                    )
                                  }
                                  return (
                                    <Input
                                      key={col.key}
                                      type="number"
                                      min={col.min}
                                      max={col.max}
                                      value={row[col.key] ?? ''}
                                      onChange={(e) => setRow(section.key, i, col.key, Number(e.target.value))}
                                      className={`w-24 ${col.width ?? ''}`}
                                    />
                                  )
                                })}
                                <button
                                  type="button"
                                  onClick={() => removeRow(section.key, i)}
                                  className="rounded border border-red-800 px-2 py-1.5 text-xs text-red-300 transition hover:bg-red-950/50"
                                >
                                  Убрать
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    if (section.type === 'features') {
                      return (
                        <div key={section.key}>
                          <div className="mb-2 flex items-center justify-between">
                            <SectionTitle>{section.label}</SectionTitle>
                            <button
                              type="button"
                              onClick={() => setFeatureModal({ section, index: null })}
                              className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                            >
                              {section.addLabel}
                            </button>
                          </div>
                          {section.subtitle && <p className="-mt-1 mb-2 text-xs text-stone-500">{section.subtitle}</p>}
                          {form[section.key].length === 0 ? (
                            <p className="text-sm text-stone-500">{section.empty}</p>
                          ) : (
                            <div className="space-y-2">
                              {form[section.key].map((f, i) => (
                                <div key={i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-stone-100">{f.name || 'Без названия'}</p>
                                        {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                                        {f.is_homebrew && <Badge>Homebrew</Badge>}
                                      </div>
                                      {f.description && (
                                        <p className="mt-0.5 line-clamp-2 text-sm text-stone-400">{f.description}</p>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setFeatureModal({ section, index: i })}
                                        className="rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                                      >
                                        Изменить
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setForm((f2) => ({
                                            ...f2,
                                            [section.key]: f2[section.key].filter((_, idx) => idx !== i),
                                          }))
                                        }
                                        className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                                      >
                                        Убрать
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    if (section.type === 'subclasses') {
                      const list = form[section.key] ?? []
                      return (
                        <div key={section.key}>
                          <div className="mb-2 flex items-center justify-between">
                            <SectionTitle>{section.label}</SectionTitle>
                            <button
                              type="button"
                              onClick={() => setSubclassModal({ index: null })}
                              className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                            >
                              {section.addLabel}
                            </button>
                          </div>
                          {list.length === 0 ? (
                            <p className="text-sm text-stone-500">{section.empty}</p>
                          ) : (
                            <div className="space-y-2">
                              {list.map((s, i) => (
                                <div key={s.id ?? i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-stone-100">{s.name || 'Без названия'}</p>
                                        {s.unlock_level != null && s.unlock_level !== '' && (
                                          <Badge tone="accent">{ruLevel(s.unlock_level)}</Badge>
                                        )}
                                        {s.is_homebrew && <Badge>Homebrew</Badge>}
                                      </div>
                                      {Array.isArray(s.features) && s.features.length > 0 && (
                                        <p className="mt-0.5 text-xs text-stone-400">{s.features.length} умений</p>
                                      )}
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setSubclassModal({ index: i })}
                                        className="rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                                      >
                                        Изменить
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setForm((f2) => ({
                                            ...f2,
                                            [section.key]: f2[section.key].filter((_, idx) => idx !== i),
                                          }))
                                        }
                                        className="rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                                      >
                                        Убрать
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    const options =
                      section.type === 'pills' ? section.options : listOptions[section.listKey]
                    return (
                      <div key={section.key}>
                        <div className="mb-2">
                          <SectionTitle>{section.label}</SectionTitle>
                        </div>
                        {options.length === 0 ? (
                          <p className="text-sm text-stone-500">{section.empty}</p>
                        ) : (
                          <PillToggle
                            options={options}
                            selected={form[section.key]}
                            onToggle={toggleIn(section.key)}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div className="flex flex-wrap gap-2 border-t border-stone-700/70 pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Сохраняем...' : editing ? 'Сохранить изменения' : 'Создать'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeForm}>
                      Отмена
                    </Button>
                  </div>
                </form>
              </Card>
            ) : showForm && editLoading ? (
              <Card className="flex items-center justify-center p-10">
                <Spinner label="Загружаем запись..." />
              </Card>
            ) : (
              <Card className="p-10 text-center">
                <p className="font-display text-lg font-bold text-stone-300">
                  Редактор {cfg.label.toLowerCase()}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  Выберите запись в списке слева, чтобы изменить её, или нажмите «+ Новая запись».
                </p>
              </Card>
            )}
          </section>
        </div>
      )}

      {featureModal && form && (() => {
        const section = featureModal.section
        const row = featureModal.index == null ? null : (form[section.key] ?? [])[featureModal.index]
        return (
          <FeatureModal
            title={
              featureModal.index == null
                ? `Добавить ${section.noun}`
                : `Изменить: ${row?.name || section.noun}`
            }
            subtitle={editing?.name}
            value={row}
            showLevel={section.showLevel}
            levelHint={section.subtitle}
            onSave={(next) => {
              setForm((f) => {
                const list = f[section.key] ?? []
                const updated =
                  featureModal.index == null
                    ? [...list, next]
                    : list.map((x, idx) => (idx === featureModal.index ? next : x))
                return { ...f, [section.key]: updated }
              })
              setFeatureModal(null)
            }}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}

      {subclassModal && form && (() => {
        const row = subclassModal.index == null ? null : (form.subclasses ?? [])[subclassModal.index]
        return (
          <SubclassModal
            key={subclassModal.index == null ? 'new' : row?.id ?? subclassModal.index}
            title={
              subclassModal.index == null
                ? 'Добавить подкласс'
                : `Изменить: ${row?.name || 'подкласс'}`
            }
            subtitle={editing?.name}
            classId={editing?.id}
            value={row}
            onSave={(next) => {
              setForm((f) => {
                const list = f.subclasses ?? []
                const updated =
                  subclassModal.index == null
                    ? [...list, next]
                    : list.map((x, idx) => (idx === subclassModal.index ? next : x))
                return { ...f, subclasses: updated }
              })
              setSubclassModal(null)
            }}
            onClose={() => setSubclassModal(null)}
          />
        )
      })()}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-stone-900 p-6 shadow-2xl ring-1 ring-red-900/60"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-bold text-stone-100">Удалить запись?</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              Вы точно хотите удалить{' '}
              <span className="font-semibold text-stone-100">«{deleteTarget.name}»</span>? Это
              действие необратимо.
            </p>
            {error && <ErrorBox error={error} onRetry={() => {}} />}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Отмена
              </Button>
              <Button variant="danger" disabled={deleting} onClick={doDelete}>
                {deleting ? 'Удаляем...' : 'Да, удалить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
