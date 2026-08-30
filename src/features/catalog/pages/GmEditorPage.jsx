import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { editorConfig, featurePayload, featuresFromRecord, sortedByLevel, subclassPayload, subracePayload, SPELL_LEVEL_KEYS } from '@/features/catalog/config/editors/index.js'
import FeatureModal from '@/features/catalog/components/editor/FeaturesModal.jsx'
import SubclassEditor from '@/features/catalog/components/editor/SubclassEditor.jsx'
import SubraceEditor from '@/features/catalog/components/editor/SubraceEditor.jsx'
import EditorFieldControl, { SectionTitle } from '@/features/catalog/components/editor/editorShared.jsx'
import FeaturesEditorBlock from '@/features/catalog/components/editor/FeaturesEditorBlock.jsx'
import ItemsEditorBlock from '@/features/catalog/components/editor/ItemsEditorBlock.jsx'
import RecordListItem from '@/features/catalog/components/editor/RecordListItem.jsx'
import { Button, Card, ConfirmDialog, ErrorBox, Field, Input, PageHeader, PillToggle, Select, Skeleton, SkeletonCard, TextArea } from '@/components/ui'
import ItemPickerModal from '@/features/catalog/components/editor/ItemPickerModal.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'
import { useCatalogPage } from '@/features/catalog/queries.js'
import { PAGE_SIZE } from '@/features/catalog/catalog.js'

export default function GmEditorPage() {
  const [resource, setResource] = useState('races')
  const cfg = editorConfig[resource]
  const queryClient = useQueryClient()

  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const listParams = useMemo(() => {
    const params = { page, size: PAGE_SIZE, ...(cfg.listParams ?? {}) }
    if (appliedSearch.trim()) params.search = appliedSearch.trim()
    for (const f of cfg.filters ?? []) {
      if (Array.isArray(filters[f.name]) && filters[f.name].length > 0) {
        params[f.name] = filters[f.name]
      }
    }
    return params
  }, [cfg, page, appliedSearch, filters])

  const findQ = useCatalogPage(resource, listParams)
  const records = findQ.data?.items ?? null
  const total = findQ.data?.total ?? 0

  const [error, setError] = useState(null)

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

  const [choiceGroups, setChoiceGroups] = useState([])
  const [choiceGroupsLoading, setChoiceGroupsLoading] = useState(false)
  const [choiceGroupsError, setChoiceGroupsError] = useState(null)

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

  const [openSubs, setOpenSubs] = useState(() => new Set())
  const [openSubraces, setOpenSubraces] = useState(() => new Set())

  const [featureModal, setFeatureModal] = useState(null)
  const [confirmSub, setConfirmSub] = useState(null)
  const [confirmSubDeleting, setConfirmSubDeleting] = useState(false)
  const [subDeleteError, setSubDeleteError] = useState(null)
  const [confirmSubrace, setConfirmSubrace] = useState(null)
  const [confirmSubraceDeleting, setConfirmSubraceDeleting] = useState(false)
  const [subraceDeleteError, setSubraceDeleteError] = useState(null)
  const [confirmRow, setConfirmRow] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    findQ.refetch()
    queryClient.invalidateQueries({ queryKey: ['catalog', 'pills'] })
  }

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
    if (cfg.choiceGroupsOps) keys.add('items')
    return Array.from(keys)
  }, [cfg])

  const pillsQ = useQuery({
    queryKey: ['catalog', 'pills', resource, pillKeys],
    queryFn: async () => {
      const needed = pillKeys.filter((key) => key !== resource)
      if (needed.length === 0) return {}
      const apis = { skills: api.skills, classes: api.classes, races: api.races, items: api.items }
      const loaders = {
        subclasses: async () => {
          const parents = await api.classes.list({ size: 100 }).then((p) => p.items ?? [])
          const details = await Promise.all(parents.map((c) => api.classes.get(c.id).catch(() => null)))
          return details.flatMap((d, i) =>
            (d?.subclasses ?? []).map((s) => ({ ...s, parentName: parents[i]?.name }))
          )
        },
        subraces: async () => {
          const parents = await api.races.list({ size: 100 }).then((p) => p.items ?? [])
          const details = await Promise.all(parents.map((rc) => api.races.get(rc.id).catch(() => null)))
          return details.flatMap((d, i) =>
            (d?.subraces ?? []).map((s) => ({ ...s, parentName: parents[i]?.name }))
          )
        },
      }
      const arrays = await Promise.all(
        needed.map((key) =>
          loaders[key]
            ? loaders[key]()
            : apis[key].list({ size: 100 }).then((page) => page.items ?? [])
        )
      )
      const next = {}
      needed.forEach((key, i) => {
        next[key] = arrays[i]
      })
      return next
    },
    enabled: pillKeys.length > 0,
  })
  const pills = pillsQ.data ?? {}

  const setSubDetail = (id, patch) =>
    setSubDetails((m) => ({ ...m, [id]: { ...(m[id] ?? {}), ...patch } }))

  const loadSubDetail = async (classId, sub) => {
    setSubDetail(sub.id, { loading: true, error: null })
    try {
      const detail = await api.classes.subclasses.get(classId, sub.id)
      setSubDetail(sub.id, { detail, features: sortedByLevel(detail.features), loading: false })
    } catch (e) {
      setSubDetail(sub.id, { loading: false, error: e })
    }
  }

  const reloadSubDetail = async (subId) => {
    const sub = subclasses.find((s) => s.id === subId)
    if (sub) await loadSubDetail(editing.id, sub)
  }

  const toggleSub = (id) => {
    const next = new Set(openSubs)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      const info = subDetails[id]
      if (!info?.detail && !info?.loading) {
        const sub = subclasses.find((s) => s.id === id)
        if (sub) loadSubDetail(editing.id, sub)
      }
    }
    setOpenSubs(next)
  }

  const reloadFeatures = async (id) => {
    setFeaturesLoading(true)
    setFeaturesError(null)
    try {
      setFeatures(featuresFromRecord(await cfg.featuresOps.list(id ?? editing.id)))
    } catch (e) {
      setFeaturesError(e)
    } finally {
      setFeaturesLoading(false)
    }
  }

  const reloadItems = async (id) => {
    setStartingItemsLoading(true)
    setStartingItemsError(null)
    try {
      setStartingItems(await cfg.itemsOps.list(id ?? editing.id))
    } catch (e) {
      setStartingItemsError(e)
    } finally {
      setStartingItemsLoading(false)
    }
  }

  const saveItems = async (payload) => {
    try {
      const rows = Array.isArray(payload) ? payload : payload?.items
      await cfg.itemsOps.set(editing.id, { items: rows ?? [] })
      if (payload?.choice_groups && cfg.choiceGroupsOps) {
        const groups = payload.choice_groups.map((g) => ({
          pick_count: Math.max(1, Number(g.pick_count) || 1),
          sort_order: Number(g.sort_order) || 0,
          options: (g.options ?? []).map((o) => ({
            item_id: Number(o.item_id),
            quantity: Math.max(1, Number(o.quantity) || 1),
          })),
        }))
        await cfg.choiceGroupsOps.set(editing.id, { choice_groups: groups })
      }
      setItemsModalOpen(false)
      await reloadItems()
      if (cfg.choiceGroupsOps) await reloadChoiceGroups()
    } catch (e) {
      setStartingItemsError(e)
    }
  }

  const reloadChoiceGroups = async (id) => {
    setChoiceGroupsLoading(true)
    setChoiceGroupsError(null)
    try {
      const res = await cfg.choiceGroupsOps.list(id ?? editing.id)
      setChoiceGroups(res?.choice_groups ?? [])
    } catch (e) {
      setChoiceGroupsError(e)
    } finally {
      setChoiceGroupsLoading(false)
    }
  }

  const reloadSubclasses = async (classId) => {
    setSubError(null)
    try {
      const full = await api.classes.get(classId)
      const list = full.subclasses ?? []
      setSubclasses(list)
      setSubDetails({})
      openSubs.forEach((id) => {
        const sub = list.find((s) => s.id === id)
        if (sub) loadSubDetail(classId, sub)
      })
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

  const toggleSubrace = (id) => {
    const next = new Set(openSubraces)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      const info = subraceDetails[id]
      if (!info?.detail && !info?.loading) {
        const sub = subraces.find((s) => s.id === id)
        if (sub) loadSubraceDetail(editing.id, sub)
      }
    }
    setOpenSubraces(next)
  }

  const reloadSubraces = async (raceId) => {
    setSubraceError(null)
    try {
      const full = await api.races.get(raceId)
      const list = full.subraces ?? []
      setSubraces(list)
      setSubraceDetails({})
      openSubraces.forEach((id) => {
        const sub = list.find((s) => s.id === id)
        if (sub) loadSubraceDetail(raceId, sub)
      })
    } catch (e) {
      setSubraceError(e)
    }
  }

  const loadNested = async (id) => {
    if (cfg.featuresOps) await reloadFeatures(id)
    if (cfg.itemsOps) await reloadItems(id)
    if (cfg.choiceGroupsOps) await reloadChoiceGroups(id)
    if (cfg.hasSubclasses) await reloadSubclasses(id)
    if (cfg.hasSubraces) await reloadSubraces(id)
  }

  const selectResource = (key) => {
    if (key === resource) return
    setResource(key)
    setQueryInput('')
    setAppliedSearch('')
    setFilters({})
    setShowFilters(false)
    setPage(1)
    setError(null)
    closeForm()
  }

  const applySearch = () => {
    setAppliedSearch(queryInput)
    setPage(1)
  }

  const applyFilters = (next) => {
    setFilters(next)
    setPage(1)
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
      const enriched = cfg.enrich ? await cfg.enrich(full) : full
      setEditing(enriched)
      setForm(cfg.fromRecord(enriched))
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
    setOpenSubs(new Set())
    setOpenSubraces(new Set())
  }

  const hasActiveFilters = (cfg.filters ?? []).some(
    (f) => Array.isArray(filters[f.name]) && filters[f.name].length > 0,
  )
  const hasQuery = appliedSearch.trim().length > 0 || hasActiveFilters

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
    const toOptions = (arr) =>
      arr.map((x) => ({
        value: x.id,
        label: x.parentName ? `${x.parentName} — ${x.name}` : x.name,
      }))
    const srcFor = (key) => pills[key] ?? []
    return {
      skills: toOptions(srcFor('skills')),
      classes: toOptions(srcFor('classes')),
      races: toOptions(srcFor('races')),
      items: toOptions(srcFor('items')),
      subclasses: toOptions(srcFor('subclasses')),
      subraces: toOptions(srcFor('subraces')),
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
      const enriched = cfg.enrich ? await cfg.enrich(full) : full
      setEditing(enriched)
      setForm(cfg.fromRecord(enriched))
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
    try {
      if (subId != null) {
        // Подкласс: источник = SUBCLASS + subclass_id.
        const source = { type: 'SUBCLASS', fk: 'subclass_id', sourceId: subId }
        await upsertFeature(next, index, source)
        await reloadSubDetail(subId)
      } else {
        // Класс/раса/предыстория/прочее: источник из конфига.
        const source = cfg.featuresSource
          ? { type: cfg.featuresSource.type, fk: cfg.featuresSource.fk, sourceId: editing.id }
          : null
        await upsertFeature(next, index, source)
        await reloadFeatures()
      }
      setFeatureModal(null)
    } catch (e) {
      setFeaturesError(e)
    }
  }

  // Общие операции централизованы на /api/features (+ /api/features/ability-increases).
  const upsertFeature = async (next, index, source) => {
    if (index == null) {
      const created = await api.features.create(featurePayload(next, source))
      await saveFeatureIncreases(created.id, next.ability_increases)
    } else {
      await api.features.update(next.id, featurePayload(next))
      await saveFeatureIncreases(next.id, next.ability_increases)
    }
  }

  const saveFeatureIncreases = async (featureId, increases = []) => {
    const list = Array.isArray(increases) ? increases : []
    await api.features.abilityIncreases.set(featureId, { ability_increases: list })
  }

  const removeFeature = async (f) => {
    try {
      await api.features.remove(f.id)
      await reloadFeatures()
    } catch (e) {
      setFeaturesError(e)
    }
  }

  const openNewSub = () => {
    setNewSub({ name: '', description: '' })
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
        actions={<Button onClick={openCreate}>+ Новая запись</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Поиск: имя, описание..."
          className="input-search w-full sm:w-80"
        />
        <button
          type="button"
          onClick={applySearch}
          title="Искать на сервере"
          className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
        >
          ⌕
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`shrink-0 rounded border px-3 py-2.5 text-sm font-medium transition ${
            hasActiveFilters
              ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
              : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
          }`}
        >
          Фильтр
        </button>
      </div>

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
              {c.label}
            </button>
          )
        })}
      </div>

      {(findQ.error || error) && <ErrorBox error={findQ.error ?? error} onRetry={load} />}
      {!error && !records && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]" aria-busy="true">
          <aside className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="fantasy-panel space-y-2 rounded-lg p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            ))}
          </aside>
          <div className="min-w-0">
            <SkeletonCard className="min-h-[26rem]" />
          </div>
        </div>
      )}

      {!error && records && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="flex max-h-[calc(100vh-280px)] min-h-0 flex-col overflow-hidden lg:sticky lg:top-24">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {records.length === 0 ? (
                <p className="text-sm text-stone-500">
                  {hasQuery ? 'Ничего не найдено по запросу' : 'Нет записей — создайте первую'}
                </p>
              ) : (
                records.map((it) => (
                  <RecordListItem
                    key={it.id}
                    item={it}
                    selectedId={selectedId}
                    badges={cfg.listBadges(it)}
                    onEdit={openEdit}
                  />
                ))
              )}
            </div>
            <div className="shrink-0">
              <Pagination page={page} total={total} size={PAGE_SIZE} onPage={setPage} />
            </div>
          </aside>

          <section className="min-w-0">
            {showForm && form ? (
              <Card className="detail-padded">
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
                        className="my-[5px]"
                        onClick={() => setDeleteTarget(editing)}
                      >
                        Удалить...
                      </Button>
                    )}
                  </div>
                </div>

                <form onSubmit={editing ? saveFields : createSubmit} className="flex flex-col gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(() => {
                      const visibleFields = cfg.fields.filter(
                        (field) => !(field.showWhen && !field.showWhen(form))
                      )
                      const groups = []
                      for (let i = 0; i < visibleFields.length; i++) {
                        const field = visibleFields[i]
                        if (field.inline && visibleFields[i + 1]?.inline) {
                          groups.push([field, visibleFields[i + 1]])
                          i += 1
                        } else {
                          groups.push([field])
                        }
                      }
                      const renderField = (field) =>
                        field.type === 'checkbox' ? (
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
                        ) : (
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
                      return groups.map((group) =>
                        group.length === 2 ? (
                          <div
                            key={`${group[0].key}-${group[1].key}`}
                            className="grid grid-cols-2 gap-4 sm:col-span-2"
                          >
                            {group.map((field) => renderField(field))}
                          </div>
                        ) : (
                          renderField(group[0])
                        )
                      )
                    })()}
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
                              className="my-[5px]"
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
                                    <th className="border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm font-semibold text-stone-400">
                                      Кантрип
                                    </th>
                                    {Array.from({ length: 9 }, (_, i) => (
                                      <th
                                        key={i}
                                        className="border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm font-semibold text-stone-400"
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
                                        <td className="border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-300">
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
                                            className="rounded my-[5px] px-1.5 py-0.5 text-xs text-red-400 transition hover:bg-red-950/50 hover:text-red-300"
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
                    if (section.type === 'spellcasting') {
                      const ability = form[section.key] ?? ''
                      return (
                        <div key={section.key}>
                          <div className="mb-2">
                            <SectionTitle>{section.label}</SectionTitle>
                          </div>
                          <Select
                            value={ability}
                            onChange={(e) => {
                              const value = e.target.value
                              setForm((f) => ({
                                ...f,
                                [section.key]: value,
                                ...(value ? {} : { [section.slotsKey]: {} }),
                              }))
                            }}
                            className="w-48"
                          >
                            {(section.options ?? []).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </Select>
                          <p className="mt-1 text-xs text-stone-500">
                            {ability ? section.hint : section.chooseHint}
                          </p>
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
                              className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-40"
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
                          <div className="flex flex-wrap gap-2">
                            {form[section.key].map((row, i) => (
                              <div
                                key={i}
                                className="flex w-[calc(50%-0.5rem)] min-w-[260px] items-center gap-2"
                              >
                                {section.columns.map((col) => {
                                  const control = (() => {
                                    if (col.type === 'select') {
                                      return (
                                        <Select
                                          value={row[col.key]}
                                          onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                          className={section.fixedWidths ? 'w-full' : `flex-1 ${col.width ?? ''}`}
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
                                          value={row[col.key] ?? ''}
                                          onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                          placeholder={col.placeholder}
                                          rows={col.rows ?? 2}
                                          className={section.fixedWidths ? 'w-full' : `min-h-0 flex-1 ${col.width ?? ''}`}
                                        />
                                      )
                                    }
                                    if (col.type === 'text') {
                                      return (
                                        <Input
                                          type="text"
                                          value={row[col.key] ?? ''}
                                          onChange={(e) => setRow(section.key, i, col.key, e.target.value)}
                                          placeholder={col.placeholder}
                                          className={section.fixedWidths ? 'w-full' : `flex-1 ${col.width ?? ''}`}
                                        />
                                      )
                                    }
                                    return (
                                      <Input
                                        type="number"
                                        min={col.min}
                                        max={col.max}
                                        value={row[col.key] ?? ''}
                                        onChange={(e) => setRow(section.key, i, col.key, Number(e.target.value))}
                                        className={section.fixedWidths ? 'w-full' : `w-24 ${col.width ?? ''}`}
                                      />
                                    )
                                  })()
                                  return (
                                    <div key={col.key} className={section.fixedWidths ? col.width ?? 'flex-1' : 'contents'}>
                                      {control}
                                    </div>
                                  )
                                })}
                                {section.fixedWidths ? (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRow({ key: section.key, index: i })}
                                    className="my-[5px] rounded border border-red-800 px-2 py-1.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                                  >
                                    Удалить
                                  </button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="sm"
                                    className="my-[5px]"
                                    onClick={() => setConfirmRow({ key: section.key, index: i })}
                                  >
                                    Убрать
                                  </Button>
                                )}
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

                  <div className="flex flex-wrap items-center gap-2 pt-4">
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
                  <FeaturesEditorBlock
                    block={cfg.featuresBlock}
                    items={features}
                    loading={featuresLoading}
                    error={featuresError}
                    showLevel={cfg.featuresModal.showLevel}
                    onAdd={() => openFeatureModal(null, null)}
                    onEdit={(i) => openFeatureModal(null, i)}
                    onRemove={removeFeature}
                    onRetry={reloadFeatures}
                  />
                )}

                {editing && cfg.itemsOps && (
                  <ItemsEditorBlock
                    block={cfg.itemsBlock}
                    items={startingItems}
                    loading={startingItemsLoading}
                    error={startingItemsError}
                    onAdd={() => setItemsModalOpen(true)}
                    onRetry={reloadItems}
                    choiceGroups={cfg.choiceGroupsOps ? choiceGroups : null}
                    choiceGroupsLoading={choiceGroupsLoading}
                    choiceGroupsError={choiceGroupsError}
                    onChoiceGroupsRetry={reloadChoiceGroups}
                  />
                )}

                {editing && cfg.hasSubclasses && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <SectionTitle>Подклассы (архетипы)</SectionTitle>
                      <button
                        type="button"
                        onClick={openNewSub}
                        className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        + Добавить подкласс
                      </button>
                    </div>
                    {subError && <ErrorBox error={subError} onRetry={() => reloadSubclasses(editing.id)} />}

                    {newSub && (
                      <div className="mb-3 rounded-lg border border-ember/40 bg-stone-900/60 p-4">
                        <p className="mb-3 font-display text-sm font-bold text-stone-100">Новый подкласс</p>
                        {newSubError && <ErrorBox error={newSubError} onRetry={() => {}} className="mb-[5px]" />}
                        <Field label="Название подкласса">
                          <Input value={newSub.name} onChange={setNewSubField('name')} placeholder="Например, Школа Воплощения" />
                        </Field>
                        <Field label="Описание" className="my-[5px]">
                          <TextArea value={newSub.description} onChange={setNewSubField('description')} rows={2} />
                        </Field>
                        <div className="mb-[5px] flex flex-wrap items-center gap-2">
                          <Button type="button" disabled={newSubSaving} onClick={saveNewSub} className="my-[5px]">
                            {newSubSaving ? 'Создаём...' : 'Создать подкласс'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setNewSub(null)} className="my-[5px]">
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
                          const open = openSubs.has(sub.id)
                          return (
                            <div
                              key={sub.id}
                              className="rounded-lg border border-stone-700/60 bg-stone-900/60"
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSub(sub.id)}
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                                >
                                  <span
                                    className={`text-xs text-stone-500 transition-transform ${
                                      open ? 'rotate-90' : ''
                                    }`}
                                  >
                                    ▸
                                  </span>
                                  <span className="truncate text-sm font-medium text-stone-100">
                                    {info.detail?.name ?? sub.name}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmSub(sub)}
                                  className="shrink-0 my-[5px] rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                                >
                                  Удалить
                                </button>
                              </div>
                              {open && (
                                <div className="border-t border-stone-700/60 p-4">
                                  {!info.detail && info.loading ? (
                                    <div className="space-y-2" aria-busy="true">
                                      <Skeleton className="h-4 w-1/2" />
                                      <Skeleton className="h-4 w-2/3" />
                                      <Skeleton className="h-4 w-1/3" />
                                    </div>
                                  ) : !info.detail && info.error ? (
                                    <ErrorBox
                                      error={info.error}
                                      onRetry={() => loadSubDetail(editing.id, sub)}
                                    />
                                  ) : info.detail ? (
                                    <SubclassEditor
                                      classId={editing.id}
                                      detail={info.detail}
                                      features={info.features ?? []}
                                      error={info.error}
                                      onRefresh={() => reloadSubDetail(sub.id)}
                                    />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {editing && cfg.hasSubraces && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <SectionTitle>Подрасы</SectionTitle>
                      <button
                        type="button"
                        onClick={openNewSubrace}
                        className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                      >
                        + Добавить подрасу
                      </button>
                    </div>
                    {subraceError && <ErrorBox error={subraceError} onRetry={() => reloadSubraces(editing.id)} />}

                    {newSubrace && (
                      <div className="mb-3 rounded-lg border border-ember/40 bg-stone-900/60 p-4">
                        <p className="mb-3 font-display text-sm font-bold text-stone-100">Новая подраса</p>
                        {newSubraceError && <ErrorBox error={newSubraceError} onRetry={() => {}} className="mb-[5px]" />}
                        <div className="mb-[5px] grid gap-3">
                          <Field label="Название подрасы">
                            <Input
                              value={newSubrace.name}
                              onChange={setNewSubraceField('name')}
                              placeholder="Например, Высший эльф"
                            />
                          </Field>
                        </div>
                        <Field label="Описание" className="my-[5px]">
                          <TextArea value={newSubrace.description} onChange={setNewSubraceField('description')} rows={2} />
                        </Field>
                        <div className="mb-[5px] flex flex-wrap items-center gap-2">
                          <Button type="button" disabled={newSubraceSaving} onClick={saveNewSubrace} className="my-[5px]">
                            {newSubraceSaving ? 'Создаём...' : 'Создать подрасу'}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setNewSubrace(null)} className="my-[5px]">
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
                          const open = openSubraces.has(sub.id)
                          return (
                            <div
                              key={sub.id}
                              className="rounded-lg border border-stone-700/60 bg-stone-900/60"
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSubrace(sub.id)}
                                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                                >
                                  <span
                                    className={`text-xs text-stone-500 transition-transform ${
                                      open ? 'rotate-90' : ''
                                    }`}
                                  >
                                    ▸
                                  </span>
                                  <span className="truncate text-sm font-medium text-stone-100">
                                    {info.detail?.name ?? sub.name}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmSubrace(sub)}
                                  className="shrink-0 my-[5px] rounded border border-red-800 px-2 py-0.5 text-[11px] text-red-300 transition hover:bg-red-950/50"
                                >
                                  Удалить
                                </button>
                              </div>
                              {open && (
                                <div className="border-t border-stone-700/60 p-4">
                                  {!info.detail && info.loading ? (
                                    <div className="space-y-2" aria-busy="true">
                                      <Skeleton className="h-4 w-1/2" />
                                      <Skeleton className="h-4 w-2/3" />
                                      <Skeleton className="h-4 w-1/3" />
                                    </div>
                                  ) : !info.detail && info.error ? (
                                    <ErrorBox
                                      error={info.error}
                                      onRetry={() => loadSubraceDetail(editing.id, sub)}
                                    />
                                  ) : info.detail ? (
                                    <SubraceEditor
                                      raceId={editing.id}
                                      detail={info.detail}
                                      features={info.features ?? []}
                                      error={info.error}
                                      onRefresh={() => reloadSubraceDetail(sub.id)}
                                    />
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ) : showForm && editLoading ? (
              <Card className="p-10" aria-busy="true">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-72" />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-5 w-40" />
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
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

      {showFilters && (
        <FilterModal
          filters={cfg.filters ?? []}
          value={filters}
          onChange={applyFilters}
          onClose={() => setShowFilters(false)}
        />
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
            levelRequired={cfg.featuresModal.levelRequired}
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
          choiceGroups={cfg.choiceGroupsOps ? choiceGroups : null}
          onSave={saveItems}
          onClose={() => setItemsModalOpen(false)}
        />
      )}

      {confirmRow && (
        <ConfirmDialog
          title="Удалить строку?"
          message="Вы точно хотите удалить эту строку? Это действие необратимо."
          onCancel={() => setConfirmRow(null)}
          onConfirm={() => {
            setConfirmRow(null)
            removeRow(confirmRow.key, confirmRow.index)
          }}
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
