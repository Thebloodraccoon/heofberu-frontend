import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/endpoints.js'
import { editorConfig, featurePayload, featuresFromRecord, subclassPayload, subracePayload, SPELL_LEVEL_KEYS } from '../editor.js'
import FeatureModal from '../components/FeaturesModal.jsx'
import SubclassEditor from '../components/SubclassEditor.jsx'
import SubraceEditor from '../components/SubraceEditor.jsx'
import { ruLevel, label } from '../labels.js'
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorBox, Field, Input, PageHeader, PillToggle, Select, Spinner, TextArea } from '../components/ui.jsx'
import ItemPickerModal from '../components/ItemPickerModal.jsx'

function SectionTitle({ children }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">{children}</p>
  )
}

function EditorFieldControl({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <TextArea
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
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
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  const [fieldSaving, setFieldSaving] = useState(false)
  const [fieldError, setFieldError] = useState(null)
  const [fieldSaved, setFieldSaved] = useState(false)

  const [features, setFeatures] = useState([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [featuresError, setFeaturesError] = useState(null)

  const [startingItems, setStartingItems] = useState([])
  const [startingItemsLoading, setStartingItemsLoading] = useState(false)
  const [startingItemsError, setStartingItemsError] = useState(null)
  const [itemsModalOpen, setItemsModalOpen] = useState(false)

  const [subclasses, setSubclasses] = useState([])
  const [subDetails, setSubDetails] = useState({})
  const [subError, setSubError] = useState(null)

  const [newSub, setNewSub] = useState(null)
  const [newSubSaving, setNewSubSaving] = useState(false)
  const [newSubError, setNewSubError] = useState(null)

  const [subraces, setSubraces] = useState([])
  const [subraceDetails, setSubraceDetails] = useState({})
  const [subraceError, setSubraceError] = useState(null)

  const [newSubrace, setNewSubrace] = useState(null)
  const [newSubraceSaving, setNewSubraceSaving] = useState(false)
  const [newSubraceError, setNewSubraceError] = useState(null)

  const [featureModal, setFeatureModal] = useState(null)
  const [confirmSub, setConfirmSub] = useState(null)
  const [confirmSubDeleting, setConfirmSubDeleting] = useState(false)
  const [subDeleteError, setSubDeleteError] = useState(null)
  const [confirmSubrace, setConfirmSubrace] = useState(null)
  const [confirmSubraceDeleting, setConfirmSubraceDeleting] = useState(false)
  const [subraceDeleteError, setSubraceDeleteError] = useState(null)

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
      if (section.type === 'rows') {
        for (const col of section.columns ?? []) {
          if (col.listKey) keys.add(col.listKey)
        }
      }
    }
    if (cfg.itemsOps) keys.add('items')
    return Array.from(keys)
  }, [cfg])

  useEffect(() => {
    let active = true
    const needed = pillKeys.filter((key) => key !== resource)
    if (needed.length === 0) return () => {}
    const apis = { skills: api.skills, classes: api.classes, races: api.races, items: api.items }
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

  const setSubDetail = (id, patch) =>
    setSubDetails((m) => ({ ...m, [id]: { ...(m[id] ?? {}), ...patch } }))

  const loadSubDetail = async (classId, sub) => {
    setSubDetail(sub.id, { loading: true, error: null })
    try {
      const detail = await api.classes.subclasses.get(classId, sub.id)
      setSubDetail(sub.id, { detail, features: detail.features ?? [], loading: false })
    } catch (e) {
      setSubDetail(sub.id, { loading: false, error: e })
    }
  }

  const reloadSubDetail = async (subId) => {
    const sub = subclasses.find((s) => s.id === subId)
    if (sub) await loadSubDetail(editing.id, sub)
  }

  const reloadFeatures = async () => {
    setFeaturesLoading(true)
    setFeaturesError(null)
    try {
      setFeatures(featuresFromRecord(await cfg.featuresOps.list(editing.id)))
    } catch (e) {
      setFeaturesError(e)
    } finally {
      setFeaturesLoading(false)
    }
  }

  const reloadItems = async () => {
    setStartingItemsLoading(true)
    setStartingItemsError(null)
    try {
      setStartingItems(await cfg.itemsOps.list(editing.id))
    } catch (e) {
      setStartingItemsError(e)
    } finally {
      setStartingItemsLoading(false)
    }
  }

  const saveItems = async (rows) => {
    try {
      await cfg.itemsOps.set(editing.id, { items: rows })
      setItemsModalOpen(false)
      await reloadItems()
    } catch (e) {
      setStartingItemsError(e)
    }
  }

  const removeItem = async (it) => {
    try {
      await cfg.itemsOps.set(editing.id, {
        items: startingItems
          .filter((x) => x.item_id !== it.item_id)
          .map((x) => ({ item_id: x.item_id, quantity: x.quantity })),
      })
      await reloadItems()
    } catch (e) {
      setStartingItemsError(e)
    }
  }

  const reloadSubclasses = async (classId) => {
    setSubError(null)
    try {
      const full = await api.classes.get(classId)
      const list = full.subclasses ?? []
      setSubclasses(list)
      setSubDetails({})
      await Promise.all(list.map((s) => loadSubDetail(classId, s)))
    } catch (e) {
      setSubError(e)
    }
  }

  const setSubraceDetail = (id, patch) =>
    setSubraceDetails((m) => ({ ...m, [id]: { ...(m[id] ?? {}), ...patch } }))

  const loadSubraceDetail = async (raceId, sub) => {
    setSubraceDetail(sub.id, { loading: true, error: null })
    try {
      const detail = await api.races.subraces.get(raceId, sub.id)
      setSubraceDetail(sub.id, { detail, features: detail.features ?? [], loading: false })
    } catch (e) {
      setSubraceDetail(sub.id, { loading: false, error: e })
    }
  }

  const reloadSubraceDetail = async (subId) => {
    const sub = subraces.find((s) => s.id === subId)
    if (sub) await loadSubraceDetail(editing.id, sub)
  }

  const reloadSubraces = async (raceId) => {
    setSubraceError(null)
    try {
      const full = await api.races.get(raceId)
      const list = full.subraces ?? []
      setSubraces(list)
      setSubraceDetails({})
      await Promise.all(list.map((s) => loadSubraceDetail(raceId, s)))
    } catch (e) {
      setSubraceError(e)
    }
  }

  const loadNested = async (id) => {
    if (cfg.featuresOps) {
      setFeaturesLoading(true)
      setFeaturesError(null)
      try {
        setFeatures(featuresFromRecord(await cfg.featuresOps.list(id)))
      } catch (e) {
        setFeaturesError(e)
      } finally {
        setFeaturesLoading(false)
      }
    }
    if (cfg.itemsOps) {
      await reloadItems()
    }
    if (cfg.hasSubclasses) {
      await reloadSubclasses(id)
    }
    if (cfg.hasSubraces) {
      await reloadSubraces(id)
    }
  }

  const selectResource = (key) => {
    if (key === resource) return
    setResource(key)
    setQuery('')
    setError(null)
    setRecords(null)
    closeForm()
  }

  const openCreate = () => {
    setEditing(null)
    setForm(cfg.emptyForm())
    setFeatureModal(null)
    setShowForm(true)
  }

  const openEdit = async (rec) => {
    setError(null)
    setFeatureModal(null)
    setEditLoading(true)
    setShowForm(true)
    setSelectedId(rec.id)
    try {
      const full = await cfg.api.get(rec.id)
      setEditing(full)
      setForm(cfg.fromRecord(full))
      await loadNested(full.id)
    } catch (e) {
      setError(e)
    } finally {
      setEditLoading(false)
    }
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setSelectedId(null)
    setForm(null)
    setFeatureModal(null)
    setEditLoading(false)
    setFieldError(null)
    setFieldSaved(false)
    setFeatures([])
    setFeaturesError(null)
    setStartingItems([])
    setStartingItemsError(null)
    setItemsModalOpen(false)
    setSubclasses([])
    setSubDetails({})
    setSubError(null)
    setNewSub(null)
    setNewSubError(null)
    setConfirmSub(null)
    setSubDeleteError(null)
    setSubraces([])
    setSubraceDetails({})
    setSubraceError(null)
    setNewSubrace(null)
    setNewSubraceError(null)
    setConfirmSubrace(null)
    setSubraceDeleteError(null)
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
    const selOptions = selCol.options ?? listOptions[selCol.listKey] ?? []
    setForm((f) => {
      const rows = f[section.key] ?? []
      const used = new Set(rows.map((r) => r[selCol.key]))
      const free = selOptions.find((o) => !used.has(o.value))
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
  const addSpellSlotLevel = (key) =>
    setForm((f) => {
      const levels = Object.keys(f[key] ?? {}).map(Number)
      const next = levels.length ? Math.max(...levels) + 1 : 1
      if (next > 20) return f
      return { ...f, [key]: { ...(f[key] ?? {}), [next]: {} } }
    })
  const removeSpellSlotLevel = (key, classLevel) =>
    setForm((f) => {
      const slots = { ...(f[key] ?? {}) }
      delete slots[classLevel]
      return { ...f, [key]: slots }
    })

  const listOptions = (() => {
    const toOptions = (arr) => arr.map((x) => ({ value: x.id, label: x.name }))
    const srcFor = (key) => (key === resource && records ? records : pills[key] ?? [])
    return {
      skills: toOptions(srcFor('skills')),
      classes: toOptions(srcFor('classes')),
      races: toOptions(srcFor('races')),
      items: toOptions(srcFor('items')),
    }
  })()

  const saveFields = async (e) => {
    e.preventDefault()
    setFieldSaving(true)
    setFieldError(null)
    setFieldSaved(false)
    try {
      await cfg.submitFields(form, editing)
      const full = await cfg.api.get(editing.id)
      setEditing(full)
      setForm(cfg.fromRecord(full))
      await loadNested(full.id)
      setFieldSaved(true)
    } catch (err) {
      setFieldError(err)
    } finally {
      setFieldSaving(false)
    }
  }

  const createSubmit = async (e) => {
    e.preventDefault()
    setFieldSaving(true)
    setFieldError(null)
    try {
      const created = await cfg.submitFields(form, null)
      if (cfg.featuresOps || cfg.hasSubclasses) {
        setEditing(created)
        setForm(cfg.fromRecord(created))
        await loadNested(created.id)
        load()
      } else {
        closeForm()
        load()
      }
    } catch (err) {
      setFieldError(err)
    } finally {
      setFieldSaving(false)
    }
  }

  const openFeatureModal = (subId, index) => setFeatureModal({ subId, index })

  const saveFeature = async (next) => {
    const { subId, index } = featureModal
    const body = featurePayload(next)
    try {
      if (subId != null) {
        if (index == null) await api.classes.subclasses.features.add(editing.id, subId, body)
        else await api.classes.subclasses.features.update(editing.id, subId, next.id, body)
        await reloadSubDetail(subId)
      } else {
        if (index == null) await cfg.featuresOps.add(editing.id, body)
        else await cfg.featuresOps.update(editing.id, next.id, body)
        await reloadFeatures()
      }
      setFeatureModal(null)
    } catch (e) {
      setFeaturesError(e)
    }
  }

  const removeFeature = async (f) => {
    try {
      await cfg.featuresOps.remove(editing.id, f.id)
      await reloadFeatures()
    } catch (e) {
      setFeaturesError(e)
    }
  }

  const openNewSub = () => {
    setNewSub({ name: '', archetype_group_name: '', description: '' })
    setNewSubError(null)
  }
  const setNewSubField = (key) => (e) => setNewSub((d) => ({ ...d, [key]: e.target.value }))
  const saveNewSub = async (e) => {
    e.preventDefault()
    setNewSubSaving(true)
    setNewSubError(null)
    try {
      await api.classes.subclasses.create(editing.id, subclassPayload(newSub))
      setNewSub(null)
      await reloadSubclasses(editing.id)
    } catch (err) {
      setNewSubError(err)
    } finally {
      setNewSubSaving(false)
    }
  }

  const openNewSubrace = () => {
    setNewSubrace({ name: '', description: '' })
    setNewSubraceError(null)
  }
  const setNewSubraceField = (key) => (e) => setNewSubrace((d) => ({ ...d, [key]: e.target.value }))
  const saveNewSubrace = async (e) => {
    e.preventDefault()
    setNewSubraceSaving(true)
    setNewSubraceError(null)
    try {
      await api.races.subraces.create(editing.id, subracePayload(newSubrace))
      setNewSubrace(null)
      await reloadSubraces(editing.id)
    } catch (err) {
      setNewSubraceError(err)
    } finally {
      setNewSubraceSaving(false)
    }
  }

  const doSubDelete = async () => {
    setConfirmSubDeleting(true)
    setSubDeleteError(null)
    try {
      await api.classes.subclasses.remove(editing.id, confirmSub.id)
      setConfirmSub(null)
      await reloadSubclasses(editing.id)
    } catch (err) {
      setSubDeleteError(err)
    } finally {
      setConfirmSubDeleting(false)
    }
  }

  const doSubraceDelete = async () => {
    setConfirmSubraceDeleting(true)
    setSubraceDeleteError(null)
    try {
      await api.races.subraces.remove(editing.id, confirmSubrace.id)
      setConfirmSubrace(null)
      await reloadSubraces(editing.id)
    } catch (err) {
      setSubraceDeleteError(err)
    } finally {
      setConfirmSubraceDeleting(false)
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
          <aside className="flex max-h-[calc(100vh-280px)] flex-col gap-2 overflow-y-auto pr-1 lg:sticky lg:top-24">
            {filtered.length === 0 ? (
              <p className="text-sm text-stone-500">Нет записей — создайте первую</p>
            ) : (
            filtered.map((it) => (
              <div
                key={it.id}
                className={`card-hover fantasy-panel cursor-pointer rounded-lg p-3 transition ${
                  selectedId === it.id
                    ? 'border-ember/80 bg-stone-900'
                    : 'hover:border-ember/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(it)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-display text-sm font-bold ${selectedId === it.id ? 'text-ember' : 'text-stone-100'}`}>{it.name}</p>
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
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      onClick={() => setDeleteTarget(it)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))
            )}
          </aside>

          <section className="min-w-0">
            {showForm && form ? (
              <Card className="p-5 sm:p-6">
                <div className="mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold text-stone-100">
                      {editing ? `Редактирование: ${editing.name}` : `Новая ${cfg.singular}`}
                    </h2>
                    {editing && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(editing)}
                      >
                        Удалить...
                      </Button>
                    )}
                  </div>
                  <div className="ornate-rule mt-3">
                    <span aria-hidden className="text-xs">
                      ✦
                    </span>
                  </div>
                </div>

                <form onSubmit={editing ? saveFields : createSubmit} className="flex flex-col gap-5">
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
                      if (section.hiddenOnEdit && editing) return false
                      if (section.showWhen && !section.showWhen(form)) return false
                      return true
                    })
                    .map((section) => {
                    if (section.type === 'spellSlots') {
                      const slotLevels = Object.keys(form[section.key] ?? {})
                        .map(Number)
                        .sort((a, b) => a - b)
                      return (
                        <div key={section.key}>
                          <div className="mb-2 flex items-center justify-between">
                            <SectionTitle>{section.label}</SectionTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addSpellSlotLevel(section.key)}
                              disabled={slotLevels.length >= 20}
                            >
                              + Добавить уровень
                            </Button>
                          </div>
                          {slotLevels.length === 0 && (
                            <p className="text-sm text-stone-500">
                              {section.empty} — нажмите «Добавить уровень», чтобы задать ячейки заклинаний.
                            </p>
                          )}
                          {slotLevels.length > 0 && (
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
                                    <th className="w-10 border border-stone-700 bg-stone-900/50 px-2 py-1" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {slotLevels.map((classLevel) => {
                                    const row = form[section.key]?.[classLevel] ?? {}
                                    return (
                                      <tr key={classLevel}>
                                        <td className="border border-stone-700 px-2 py-1 text-xs font-medium text-stone-300">
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
                                        <td className="border border-stone-700 px-1 text-center">
                                          <button
                                            type="button"
                                            onClick={() => removeSpellSlotLevel(section.key, classLevel)}
                                            className="rounded px-1.5 py-0.5 text-xs text-red-400 transition hover:bg-red-950/50 hover:text-red-300"
                                            aria-label={`Убрать уровень ${classLevel}`}
                                            title={`Убрать уровень ${classLevel}`}
                                          >
                                            ✕
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    }
                    if (section.type === 'rows') {
                      const selCol = section.columns?.find((c) => c.type === 'select')
                      const selOptions = selCol ? selCol.options ?? listOptions[selCol.listKey] ?? [] : []
                      const usedValues = selCol
                        ? new Set((form[section.key] ?? []).map((r) => r[selCol.key]))
                        : null
                      const allUsed = selCol
                        ? selOptions.every((o) => usedValues.has(o.value))
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
                              Все доступные варианты использованы — каждый вариант не может повторяться.
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
                                        {selOptions.map((o) => (
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
                                      <TextArea
                                        key={col.key}
                                        value={row[col.key] ?? ''}
                                        onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                        placeholder={col.placeholder}
                                        rows={col.rows ?? 2}
                                        className={`min-h-0 flex-1 ${col.width ?? ''}`}
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
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => removeRow(section.key, i)}
                                >
                                  Убрать
                                </Button>
                              </div>
                            ))}
                          </div>
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

                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-700/70 pt-4">
                    <Button type="submit" disabled={fieldSaving}>
                      {fieldSaving
                        ? 'Сохраняем...'
                        : editing
                          ? 'Обновить поля'
                          : 'Создать'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeForm}>
                      Отмена
                    </Button>
                    {fieldSaved && <span className="text-xs text-emerald-400">Поля обновлены</span>}
                  </div>
                  {fieldError && <ErrorBox error={fieldError} onRetry={() => {}} />}
                </form>

                {editing && cfg.featuresOps && (
                  <div className="mt-5 border-t border-stone-700/70 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <SectionTitle>{cfg.featuresBlock.label}</SectionTitle>
                      <button
                        type="button"
                        onClick={() => openFeatureModal(null, null)}
                        className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        {cfg.featuresBlock.addLabel}
                      </button>
                    </div>
                    {featuresError && <ErrorBox error={featuresError} onRetry={reloadFeatures} />}
                    {featuresLoading ? (
                      <p className="text-sm text-stone-500">Загружаем умения...</p>
                    ) : features.length === 0 ? (
                      <p className="text-sm text-stone-500">{cfg.featuresBlock.empty}</p>
                    ) : (
                      <div className="space-y-2">
                        {features.map((f, i) => (
                          <div key={f.id ?? i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-medium text-stone-100">{f.name || 'Без названия'}</p>
                                  {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                                </div>
                                {f.description && (
                                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-stone-400">{f.description}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => openFeatureModal(null, i)}
                      className="cursor-pointer rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                                >
                                  Изменить
                                </button>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="xs"
                                  onClick={() => removeFeature(f)}
                                >
                                  Удалить
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editing && cfg.itemsOps && (
                  <div className="mt-5 border-t border-stone-700/70 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <SectionTitle>{cfg.itemsBlock.label}</SectionTitle>
                      <button
                        type="button"
                        onClick={() => setItemsModalOpen(true)}
                        className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        {cfg.itemsBlock.addLabel}
                      </button>
                    </div>
                    {startingItemsError && <ErrorBox error={startingItemsError} onRetry={reloadItems} />}
                    {startingItemsLoading ? (
                      <p className="text-sm text-stone-500">Загружаем снаряжение...</p>
                    ) : startingItems.length === 0 ? (
                      <p className="text-sm text-stone-500">{cfg.itemsBlock.empty}</p>
                    ) : (
                      <div className="space-y-2">
                        {startingItems.map((it) => (
                          <div
                            key={it.item_id}
                            className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-100">
                                  {it.item?.name ?? `Предмет #${it.item_id}`}
                                </p>
                                {it.item?.item_type && (
                                  <p className="mt-0.5 text-xs text-stone-400">{label(it.item.item_type)}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <span className="text-sm text-stone-300">× {it.quantity}</span>
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="xs"
                                  onClick={() => removeItem(it)}
                                >
                                  Убрать
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {editing && cfg.hasSubclasses && (
                  <div className="mt-5 border-t border-stone-700/70 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <SectionTitle>Подклассы (архетипы)</SectionTitle>
                      <button
                        type="button"
                        onClick={openNewSub}
                        className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        + Добавить подкласс
                      </button>
                    </div>
                    {subError && <ErrorBox error={subError} onRetry={() => reloadSubclasses(editing.id)} />}

                    {newSub && (
                      <div className="mb-3 rounded-lg border border-ember/40 bg-stone-900/60 p-4">
                        <p className="mb-3 font-display text-sm font-bold text-stone-100">Новый подкласс</p>
                        {newSubError && <ErrorBox error={newSubError} onRetry={() => {}} />}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Название подкласса">
                            <Input value={newSub.name} onChange={setNewSubField('name')} placeholder="Например, Школа Воплощения" />
                          </Field>
                          <Field label="Название группы (архетипа)">
                            <Input
                              value={newSub.archetype_group_name}
                              onChange={setNewSubField('archetype_group_name')}
                              placeholder="Например, Школа магии"
                            />
                          </Field>
                        </div>
                        <Field label="Описание">
                          <TextArea value={newSub.description} onChange={setNewSubField('description')} rows={2} />
                        </Field>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" disabled={newSubSaving} onClick={saveNewSub}>
                            {newSubSaving ? 'Создаём...' : 'Создать подкласс'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setNewSub(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}

                    {subclasses.length === 0 && !newSub ? (
                      <p className="text-sm text-stone-500">Подклассов нет</p>
                    ) : (
                      <div className="space-y-3">
                        {subclasses.map((sub) => {
                          const info = subDetails[sub.id] ?? {}
                          return (
                            <SubclassEditor
                              key={info.detail ? sub.id : `loading-${sub.id}`}
                              classId={editing.id}
                              detail={info.detail ?? sub}
                              features={info.features ?? []}
                              busy={!!info.loading && !info.detail}
                              error={info.error}
                              onRefresh={() => reloadSubDetail(sub.id)}
                              onDelete={() => setConfirmSub(sub)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {editing && cfg.hasSubraces && (
                  <div className="mt-5 border-t border-stone-700/70 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <SectionTitle>Подрасы</SectionTitle>
                      <button
                        type="button"
                        onClick={openNewSubrace}
                        className="rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        + Добавить подрасу
                      </button>
                    </div>
                    {subraceError && <ErrorBox error={subraceError} onRetry={() => reloadSubraces(editing.id)} />}

                    {newSubrace && (
                      <div className="mb-3 rounded-lg border border-ember/40 bg-stone-900/60 p-4">
                        <p className="mb-3 font-display text-sm font-bold text-stone-100">Новая подраса</p>
                        {newSubraceError && <ErrorBox error={newSubraceError} onRetry={() => {}} />}
                        <div className="grid gap-3">
                          <Field label="Название подрасы">
                            <Input
                              value={newSubrace.name}
                              onChange={setNewSubraceField('name')}
                              placeholder="Например, Высший эльф"
                            />
                          </Field>
                        </div>
                        <Field label="Описание">
                          <TextArea value={newSubrace.description} onChange={setNewSubraceField('description')} rows={2} />
                        </Field>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" disabled={newSubraceSaving} onClick={saveNewSubrace}>
                            {newSubraceSaving ? 'Создаём...' : 'Создать подрасу'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setNewSubrace(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}

                    {subraces.length === 0 && !newSubrace ? (
                      <p className="text-sm text-stone-500">Подрас нет</p>
                    ) : (
                      <div className="space-y-3">
                        {subraces.map((sub) => {
                          const info = subraceDetails[sub.id] ?? {}
                          return (
                            <SubraceEditor
                              key={info.detail ? sub.id : `loading-${sub.id}`}
                              raceId={editing.id}
                              detail={info.detail ?? sub}
                              features={info.features ?? []}
                              busy={!!info.loading && !info.detail}
                              error={info.error}
                              onRefresh={() => reloadSubraceDetail(sub.id)}
                              onDelete={() => setConfirmSubrace(sub)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
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

      {featureModal && featureModal.subId == null && form && (() => {
        const row = featureModal.index == null ? null : features[featureModal.index]
        return (
          <FeatureModal
            title={
              featureModal.index == null
                ? `Добавить ${cfg.featuresBlock.noun}`
                : `Изменить: ${row?.name || cfg.featuresBlock.noun}`
            }
            subtitle={editing?.name}
            value={row}
            showLevel={cfg.featuresModal.showLevel}
            levelHint={cfg.featuresModal.levelHint}
            onSave={saveFeature}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}

      {itemsModalOpen && editing && cfg.itemsOps && (
        <ItemPickerModal
          title={`Стартовое снаряжение${editing.name ? ` — ${editing.name}` : ''}`}
          items={pills.items ?? []}
          value={startingItems}
          onSave={saveItems}
          onClose={() => setItemsModalOpen(false)}
        />
      )}

      {confirmSub && (
        <ConfirmDialog
          title="Удалить подкласс?"
          message={
            <>
              Вы точно хотите удалить{' '}
              <span className="font-semibold text-stone-100">«{confirmSub.name}»</span> вместе со
              всеми его умениями? Это действие необратимо.
            </>
          }
          error={subDeleteError}
          busy={confirmSubDeleting}
          busyText="Удаляем..."
          onCancel={() => setConfirmSub(null)}
          onConfirm={doSubDelete}
        />
      )}

      {confirmSubrace && (
        <ConfirmDialog
          title="Удалить подрасу?"
          message={
            <>
              Вы точно хотите удалить{' '}
              <span className="font-semibold text-stone-100">«{confirmSubrace.name}»</span> вместе со
              всеми его особенностями? Это действие необратимо.
            </>
          }
          error={subraceDeleteError}
          busy={confirmSubraceDeleting}
          busyText="Удаляем..."
          onCancel={() => setConfirmSubrace(null)}
          onConfirm={doSubraceDelete}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Удалить запись?"
          message={
            <>
              Вы точно хотите удалить{' '}
              <span className="font-semibold text-stone-100">«{deleteTarget.name}»</span>? Это
              действие необратимо.
            </>
          }
          error={error}
          busy={deleting}
          busyText="Удаляем..."
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDelete}
        />
      )}
    </div>
  )
}
