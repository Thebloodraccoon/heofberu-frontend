import EditorAddButton from '@/features/catalog/components/editor/EditorAddButton.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { catalogEditorTabs, catalogFieldTab, catalogSectionTab } from '@/features/catalog/config/editors/tabs.js'
import { scrollChildToTop } from '@/lib/utils/scroll.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { editorConfig, featurePayload, featuresFromRecord, persistFeatureEffects, sortedByLevel, subclassPayload, subracePayload } from '@/features/catalog/config/editors/index.js'
import FeatureModal from '@/features/catalog/components/editor/FeaturesModal.jsx'
import FeatureEffectsEditor from '@/features/catalog/components/editor/FeatureEffectsEditor.jsx'
import CatalogScalingBlock from '@/features/catalog/components/editor/CatalogScalingBlock.jsx'
import { GROUP_FIELD_TYPES, toNum } from '@/features/catalog/config/editors/shared.js'
import SubclassEditor from '@/features/catalog/components/editor/SubclassEditor.jsx'
import SubraceEditor from '@/features/catalog/components/editor/SubraceEditor.jsx'
import OptionsPicker from '@/features/catalog/components/editor/OptionsPicker.jsx'
import EditorFieldControl, { BlurNumberInput, ChoiceCountStepper, SectionTitle, TrashIcon } from '@/features/catalog/components/editor/editorShared.jsx'
import GroupedRowsEditor from '@/features/catalog/components/editor/GroupedRowsEditor.jsx'
import AbilityBonusesBlock from '@/features/catalog/components/editor/AbilityBonusesBlock.jsx'
import SpellSlotsTable from '@/features/catalog/components/editor/SpellSlotsTable.jsx'
import FeaturesEditorBlock from '@/features/catalog/components/editor/FeaturesEditorBlock.jsx'
import ItemsEditorBlock from '@/features/catalog/components/editor/ItemsEditorBlock.jsx'
import ItemEffectsEditor from '@/features/catalog/components/editor/ItemEffectsEditor.jsx'
import WeaponPropertiesPicker from '@/features/catalog/components/editor/WeaponPropertiesPicker.jsx'
import RecordListItem from '@/features/catalog/components/editor/RecordListItem.jsx'
import CatalogTagInput from '@/features/catalog/components/editor/CatalogTagInput.jsx'
import { Button, Card, ConfirmDialog, DiceField, ErrorBox, Field, Input, RichTextEditor, Select, Skeleton, SkeletonCard } from '@/components/ui'
import ImageUploadBlock from '@/features/catalog/components/editor/ImageUploadBlock.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import CatalogToolbar from '@/features/catalog/components/CatalogToolbar.jsx'
import CatalogFilterSummary from '@/features/catalog/components/CatalogFilterSummary.jsx'
import CatalogEmptyState from '@/features/catalog/components/CatalogEmptyState.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import { useCatalogPage, useWeaponProperties } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { PAGE_SIZE } from '@/features/catalog/catalog.js'

// Ширина поля в строке row (сетка в 4 колонки): span — сколько колонок.
const ROW_SPAN = { 1: 'sm:col-span-1', 2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4' }
// Гибкая строка (flex): grow — тянется, но не уже 40rem (иначе соседи уходят вниз, а потом и сами
// чипы переносятся); fixed — узкое поле (число) у края строки.
const ROW_FLEX = { grow: 'min-w-0 flex-[1_1_40rem]', fixed: 'w-[100px] flex-none' }

export default function GmEditorPage() {
  const [resource, setResource] = useState('races')
  const cfg = editorConfig[resource]
  const [editorTab, setEditorTab] = useState('main')
  const editorTabs = catalogEditorTabs[resource]
  const tabHidden = (key) => Boolean(editorTabs && editorTab !== key)
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

  // Редакторы видов предметов (оружие, доспехи…) листают общий /items с фильтром kind.
  const findQ = useCatalogPage(cfg.apiResource ?? resource, listParams)
  // Словарь свойств оружия: из него itemPatches решает, какие поля придержать.
  // Читается из кеша в момент сохранения (свежий даже для только что созданного свойства).
  useWeaponProperties({ enabled: cfg.itemKind === 'WEAPON' })
  const editorContext = () => {
    const weaponProperties = queryClient.getQueryData(queryKeys.catalog.itemProperties)
    return { weaponProperties: Array.isArray(weaponProperties) ? weaponProperties : [] }
  }
  // Правка записи меняет и публичный справочник, карточки по id и пикеры этого ресурса.
  const invalidateResource = () => queryClient.invalidateQueries({ queryKey: queryKeys.catalog.resource(cfg.apiResource ?? resource) })
  const records = findQ.data?.items ?? null
  const total = findQ.data?.total ?? 0

  const [error, setError] = useState(null)

  const [editing, setEditing] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  const [imageUrl, setImageUrl] = useState(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState(null)

  const [fieldSaving, setFieldSaving] = useState(false)
  const [fieldError, setFieldError] = useState(null)

  const { push: pushStatus } = useToasts()

  // Автосохранение полей при редактировании: без общей кнопки формы правки
  // копятся 700мс (обычный дебаунс), затем уходят через saveFields. Флаг
  // нужен, чтобы системные setForm (открытие записи, обновление формы после
  // сохранения) сами себя не считали новой правкой и не зациклили сохранение.
  const skipNextAutoSaveRef = useRef(false)
  const recordListRef = useRef(null)
  // saveFields читает форму/запись из этих рефов (не из замыкания), чтобы
  // повторный вызов после параллельной правки всегда уходил с актуальными
  // данными, а не с теми, что были на момент постановки в очередь.
  const formRef = useRef(form)
  useEffect(() => {
    formRef.current = form
  }, [form])
  const editingRef = useRef(editing)
  useEffect(() => {
    editingRef.current = editing
  }, [editing])
  const savingInFlightRef = useRef(false)
  const pendingAutoSaveRef = useRef(false)
  // saveFields сама объявлена ниже (ей нужны loadNested и др.) — эффект
  // всегда дёргает актуальную версию через реф, не саму переменную напрямую.
  const saveFieldsRef = useRef(() => {})

  useEffect(() => {
    if (!editing || !form) return
    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false
      return
    }
    const id = setTimeout(() => {
      saveFieldsRef.current()
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const [features, setFeatures] = useState([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  const [featuresError, setFeaturesError] = useState(null)

  const [startingItems, setStartingItems] = useState([])
  const [startingItemsLoading, setStartingItemsLoading] = useState(false)
  const [startingItemsError, setStartingItemsError] = useState(null)

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
  // «Нет» у характеристики заклинаний стирает ячейки — с подтверждением: { key, slotsKey }.
  const [confirmClearSlots, setConfirmClearSlots] = useState(null)
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
    return Array.from(keys)
  }, [cfg])

  const pillsQ = useQuery({
    queryKey: ['catalog', 'pills', resource, pillKeys],
    queryFn: async () => {
      const needed = pillKeys.filter((key) => key !== resource)
      if (needed.length === 0) return {}
      const apis = { skills: api.skills, classes: api.classes, races: api.races, items: api.items }
      // Один запрос списка на ресурс, даже если он нужен и сам, и как родитель.
      const lists = {}
      const listOf = (key) => (lists[key] ??= apis[key].list({ size: 100 }).then((page) => page.items ?? []))
      const loaders = {
        // Строки списка классов уже несут свои подклассы — детали классов не нужны.
        subclasses: async () =>
          (await listOf('classes')).flatMap((c) => (c.subclasses ?? []).map((s) => ({ ...s, parentId: c.id, parentName: c.name }))),
        // У рас в списке подрас нет: один лёгкий GET /subraces (все подрасы), имя расы — по race_id.
        subraces: async () => {
          const [parents, list] = await Promise.all([listOf('races'), api.races.subraces.list()])
          const raceName = Object.fromEntries(parents.map((rc) => [rc.id, rc.name]))
          return (Array.isArray(list) ? list : []).map((s) => ({ ...s, parentId: s.race_id, parentName: raceName[s.race_id] }))
        },
      }
      const arrays = await Promise.all(needed.map((key) => (loaders[key] ? loaders[key]() : listOf(key))))
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
    setOpenSubs(new Set([id]))
    const info = subDetails[id]
    if (!info?.detail && !info?.loading) {
      const sub = subclasses.find((item) => item.id === id)
      if (sub) loadSubDetail(editing.id, sub)
    }
  }

  const reloadFeatures = async (id) => {
    setFeaturesLoading(true)
    setFeaturesError(null)
    try {
      // Список фич по источнику уже приходит с ability_effects внутри
      // (NestedFeatureResponse) — отдельный запрос за эффектами не нужен.
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

  // Не глотаем ошибку здесь — она должна долететь до ItemsGrantModal/
  // ItemChoiceGroupModal (см. ItemsEditorBlock), чтобы GM видел её прямо в
  // открытой модалке и мог повторить сохранение, не потеряв правки.
  const saveGrant = async (rows) => {
    await cfg.itemsOps.set(editing.id, { items: rows })
    invalidateResource()
    await reloadItems()
  }

  const choiceGroupsPayload = (groups) =>
    groups.map((g, i) => ({
      pick_count: Math.max(1, Number(g.pick_count) || 1),
      sort_order: i,
      // Вариант — конкретный предмет или фильтр «любой предмет вида»
      // (item_id: null + заданные поля фильтра; null-поля бэк не ждёт).
      options: (g.options ?? []).map((o) => {
        const quantity = Math.max(1, Number(o.quantity) || 1)
        if (o.item_id != null) return { item_id: Number(o.item_id), quantity }
        const filter = ['kind', 'weapon_category', 'armor_category', 'tool_category'].filter((k) => o[k] != null)
        return { ...Object.fromEntries(filter.map((k) => [k, o[k]])), quantity }
      }),
    }))

  const saveChoiceGroup = async (group, index) => {
    const next = index == null ? [...choiceGroups, group] : choiceGroups.map((g, i) => (i === index ? group : g))
    await cfg.choiceGroupsOps.set(editing.id, { choice_groups: choiceGroupsPayload(next) })
    invalidateResource()
    await reloadChoiceGroups()
  }

  const removeChoiceGroup = async (index) => {
    try {
      const next = choiceGroups.filter((_, i) => i !== index)
      await cfg.choiceGroupsOps.set(editing.id, { choice_groups: choiceGroupsPayload(next) })
      invalidateResource()
      await reloadChoiceGroups()
    } catch (e) {
      setChoiceGroupsError(e)
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

  const showSubclasses = (classId, list) => {
    setSubError(null)
    setSubclasses(list)
    setSubDetails({})
    openSubs.forEach((id) => {
      const sub = list.find((s) => s.id === id)
      if (sub) loadSubDetail(classId, sub)
    })
  }

  const reloadSubclasses = async (classId) => {
    setSubError(null)
    try {
      const full = await api.classes.get(classId)
      showSubclasses(classId, full.subclasses ?? [])
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
    setOpenSubraces(new Set([id]))
    const info = subraceDetails[id]
    if (!info?.detail && !info?.loading) {
      const sub = subraces.find((item) => item.id === id)
      if (sub) loadSubraceDetail(editing.id, sub)
    }
  }

  const showSubraces = (raceId, list) => {
    setSubraceError(null)
    setSubraces(list)
    setSubraceDetails({})
    openSubraces.forEach((id) => {
      const sub = list.find((s) => s.id === id)
      if (sub) loadSubraceDetail(raceId, sub)
    })
  }

  const reloadSubraces = async (raceId) => {
    setSubraceError(null)
    try {
      const full = await api.races.get(raceId)
      showSubraces(raceId, full.subraces ?? [])
    } catch (e) {
      setSubraceError(e)
    }
  }

  // full — только что загруженная деталь записи: GET /classes|races|backgrounds/{id}
  // уже несёт features, starting_items, starting_choice_groups и подклассы/подрасы,
  // поэтому отдельные GET вложенных списков идут, только если в детали их нет.
  const loadNested = async (id, full) => {
    const has = (key) => Array.isArray(full?.[key])
    if (cfg.featuresOps) {
      if (has('features')) {
        setFeaturesError(null)
        setFeatures(featuresFromRecord(full.features))
      } else await reloadFeatures(id)
    }
    if (cfg.itemsOps) {
      if (has('starting_items')) {
        setStartingItemsError(null)
        setStartingItems(full.starting_items)
      } else await reloadItems(id)
    }
    if (cfg.choiceGroupsOps) {
      if (has('starting_choice_groups')) {
        setChoiceGroupsError(null)
        setChoiceGroups(full.starting_choice_groups)
      } else await reloadChoiceGroups(id)
    }
    if (cfg.hasSubclasses) {
      if (has('subclasses')) showSubclasses(id, full.subclasses)
      else await reloadSubclasses(id)
    }
    if (cfg.hasSubraces) {
      if (has('subraces')) showSubraces(id, full.subraces)
      else await reloadSubraces(id)
    }
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

  // Активная запись в списке слева плавно подтягивается к верху контейнера.
  useEffect(() => {
    const box = recordListRef.current
    const el = box?.querySelector('[data-active="true"]')
    if (!box || !el) return undefined
    return scrollChildToTop(box, el)
  }, [selectedId, records?.length])

  const openCreate = () => {
    setEditorTab('main')
    setEditing(null)
    setForm(cfg.emptyForm())
    setFeatureModal(null)
    setShowForm(true)
  }

  const openEdit = async (rec) => {
    setEditorTab('main')
    setError(null)
    setFeatureModal(null)
    setEditLoading(true)
    setShowForm(true)
    setSelectedId(rec.id)
    try {
      const full = await cfg.api.get(rec.id)
      const enriched = cfg.enrich ? await cfg.enrich(full) : full
      setEditing(enriched)
      setImageUrl(enriched?.image_url ?? full?.image_url ?? null)
      skipNextAutoSaveRef.current = true
      setForm(cfg.fromRecord(enriched))
      await loadNested(full.id, full)
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
    setImageUrl(null)
    setImageBusy(false)
    setImageError(null)
    setFieldError(null)
    setFeatures([])
    setFeaturesError(null)
    setStartingItems([])
    setStartingItemsError(null)
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

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e && typeof e === 'object' && 'target' in e ? e.target.value : e }))
  const setBool = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }))
  // Текстовые поля при редактировании сохраняются сами по себе (PATCH только
  // этого поля), не дожидаясь общей кнопки формы — см. EditorFieldControl.
  const saveField = (key) => async (draft) => {
    const updated = await cfg.api.update(editing.id, { [key]: draft })
    const next = updated?.[key] ?? draft
    // Поле уже сохранено само по себе — не нужно, чтобы общий дебаунс формы
    // следом отправил его ещё раз.
    skipNextAutoSaveRef.current = true
    setForm((f) => ({ ...f, [key]: next }))
    setEditing((e) => (e ? { ...e, [key]: next } : e))
  }
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
  const listOptions = (() => {
    const toOptions = (arr) =>
      arr.map((x) => ({
        value: x.id,
        label: x.parentName ? `${x.parentName} — ${x.name}` : x.name,
        ...(x.parentId != null && { parentId: x.parentId, parentName: x.parentName }),
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
    e?.preventDefault?.()
    if (!editingRef.current) return
    if (savingInFlightRef.current) {
      // Уже идёт сохранение — эта правка уйдёт следующим прогоном сразу
      // после текущего, а не потеряется.
      pendingAutoSaveRef.current = true
      return
    }
    savingInFlightRef.current = true
    // Слой сохранения делает форму inert — фокус теряется; после сохранения возвращаем его на место.
    const focused = document.activeElement
    setFieldSaving(true)
    setFieldError(null)
    pushStatus(
      'Сохраняем…',
      `${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)}: ${formRef.current?.name ?? editingRef.current?.name ?? ''}`,
      'saving',
    )
    try {
      const currentForm = formRef.current
      const currentEditing = editingRef.current
      const ctx = editorContext()
      await cfg.submitFields(currentForm, currentEditing, ctx)
      invalidateResource()
      const full = await cfg.api.get(currentEditing.id)
      const enriched = cfg.enrich ? await cfg.enrich(full) : full
      setEditing(enriched)
      setImageUrl(enriched?.image_url ?? full?.image_url ?? null)
      skipNextAutoSaveRef.current = true
      // keepHeld — придержанные (недозаполненные) поля предмета остаются из формы.
      setForm(cfg.keepHeld ? cfg.keepHeld(cfg.fromRecord(enriched), currentForm, ctx) : cfg.fromRecord(enriched))
      await loadNested(full.id, full)
      pushStatus('Сохранено', `${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)}: ${enriched?.name ?? ''}`)
    } catch (err) {
      setFieldError(err)
    } finally {
      setFieldSaving(false)
      requestAnimationFrame(() => {
        if (focused?.isConnected && focused !== document.body) focused.focus({ preventScroll: true })
      })
      savingInFlightRef.current = false
      if (pendingAutoSaveRef.current) {
        pendingAutoSaveRef.current = false
        saveFields()
      }
    }
  }
  useEffect(() => {
    saveFieldsRef.current = saveFields
  })

  const createSubmit = async (e) => {
    e.preventDefault()
    setFieldSaving(true)
    setFieldError(null)
    try {
      const created = await cfg.submitFields(form, null, editorContext())
      invalidateResource()
      if (cfg.featuresOps || cfg.hasSubclasses) {
        setEditing(created)
        setImageUrl(created?.image_url ?? null)
        setForm(cfg.fromRecord(created))
        await loadNested(created.id)
        load()
      } else if (created?.id != null) {
        // Сразу открываем созданную запись в режиме редактирования.
        load()
        await openEdit(created)
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
      // Особенности встроены в деталь родителя (класс/раса/предыстория) — её кеш тоже устарел.
      invalidateResource()
      setFeatureModal(null)
    } catch (e) {
      setFeaturesError(e)
      throw e
    }
  }

  // Общие операции централизованы на /features (+ /effects и /choice-groups):
  // фиксированные эффекты и группы выбора сохраняются полной заменой дерева.
  const upsertFeature = async (next, index, source) => {
    const effects = next.effects ?? { ...(next.ability_effects ? { ability_effects: next.ability_effects } : {}) }
    if (index == null) {
      const created = await api.features.create(featurePayload(next, source))
      // Особенность только что создана — эффектов в базе ещё нет, дифф считаем
      // от пустого дерева (без лишнего GET).
      await saveFeatureEffects(created.id, effects, {})
    } else {
      await api.features.update(next.id, featurePayload(next))
      await saveFeatureEffects(next.id, effects)
    }
  }

  const saveFeatureEffects = async (featureId, effects = {}, prev) => {
    // Бэк принимает только точечные правки дерева (строка эффекта, группа
    // выбора, вариант), поэтому persistFeatureEffects считает дифф от prev —
    // или перечитывает текущее дерево, если prev не передан. Так уже отвеченные
    // игроками выборы не сбрасываются в pending без необходимости. Кеш
    // react-query по этой особенности инвалидируется внутри.
    await persistFeatureEffects(featureId, effects, prev)
  }

  const removeFeature = async (f) => {
    try {
      await api.features.remove(f.id)
      invalidateResource()
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
      invalidateResource()
      if (editing?.id === deleteTarget.id) closeForm()
      setDeleteTarget(null)
      load()
    } catch (err) {
      setError(err)
    } finally {
      setDeleting(false)
    }
  }

  const uploadImage = async (file) => {
    setImageBusy(true)
    setImageError(null)
    try {
      if (!cfg.imageOps) return
      const res = await cfg.imageOps.upload(editing.id, file)
      setImageUrl(res?.image_url ?? null)
      load()
    } catch (err) {
      setImageError(err)
      throw err
    } finally {
      setImageBusy(false)
    }
  }

  const removeImage = async () => {
    if (!cfg.imageOps || !editing) return
    setImageBusy(true)
    setImageError(null)
    try {
      await cfg.imageOps.remove(editing.id)
      setImageUrl(null)
      load()
    } catch (err) {
      setImageError(err)
    } finally {
      setImageBusy(false)
    }
  }

  return (
    <div>
      <header className="lore-header article-workspace-header">
        <div>
          <p className="lore-eyebrow">Мастерская мира</p>
          <h1 className="heading-section">Редактор справочников</h1>
          <p className="lore-intro">Создавайте и изменяйте записи справочников мира.</p>
        </div>
        <Button onClick={openCreate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-4"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Новая запись
        </Button>
      </header>

      <CatalogToolbar className="mb-4" query={queryInput} onQueryChange={setQueryInput} onSearch={applySearch} onFilters={() => setShowFilters(true)} filterCount={Object.values(filters).reduce((count, values) => count + values.length, 0)} filtersOpen={showFilters} />

      <div className="editor-resource-tabs mb-6" aria-label="Тип справочника">
        <div className="editor-resource-tabs-inner">
        {Object.entries(editorConfig).map(([key, c]) => {
          const active = key === resource
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectResource(key)}
              aria-pressed={active}
              className={`editor-resource-tab ${active ? 'is-active' : ''}`}
            >
              {c.label}
            </button>
          )
        })}
        </div>
      </div>

      <CatalogFilterSummary definitions={cfg.filters ?? []} value={filters} onChange={applyFilters} />

      {(findQ.error || error) && <ErrorBox error={findQ.error ?? error} onRetry={load} />}
      {!error && !records && (
        <div className="editor-layout" aria-busy="true">
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
        <div className="editor-layout mt-[5px]">
          <aside className="flex min-h-0 flex-col lg:sticky lg:top-24 lg:max-h-[calc(100vh-220px)] lg:overflow-hidden">
            <h2 className="editor-list-label">{cfg.label} <span>{total}</span></h2>
            <div ref={recordListRef} className="editor-record-list min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {records.length === 0 ? (
                <CatalogEmptyState
                  filtered={hasQuery}
                  onCreate={openCreate}
                  onReset={() => {
                    setQueryInput('')
                    setAppliedSearch('')
                    setFilters({})
                    setPage(1)
                  }}
                />
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

          <section className="editor-detail min-w-0" aria-label="Форма записи">
            {showForm && form ? (
              <Card className={`detail-padded ${resource === 'races' ? 'race-editor' : ''}`}>
                <div className="mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-bold text-stone-100">
                      {editing ? `Редактирование: ${editing.name}` : (cfg.newTitle ?? `Новая ${cfg.singular}`)}
                    </h2>
                    {editing && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="my-[5px]"
                        onClick={() => setDeleteTarget(editing)}
                      >
                        <TrashIcon className="mr-1.5" />
                        Удалить
                      </Button>
                    )}
                  </div>
                </div>

                {editorTabs && <EditorTabs tabs={editorTabs} value={editorTab} onChange={setEditorTab} label="Разделы записи справочника" />}
                {/* Пока идёт автосохранение — текущая вкладка под мини-скелетоном и не принимает правок:
                    иначе можно наплодить параллельных запросов к одной записи. */}
                <div className="relative" aria-busy={editing && fieldSaving}>
                {editing && fieldSaving && (
                  <div className="editor-saving-overlay" role="status">
                    <div className="editor-saving-card">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-28" />
                      <span>Сохраняем изменения…</span>
                    </div>
                  </div>
                )}
                <form onSubmit={editing ? saveFields : createSubmit} className="flex flex-col gap-5" inert={editing && fieldSaving}>
                  {!editing && editorTabs && ['features', 'subraces', 'subclasses'].includes(editorTab) && <p className="text-sm text-stone-500">Сначала создайте запись, чтобы добавить {editorTab === 'subraces' ? 'подрасы' : editorTab === 'subclasses' ? 'подклассы' : 'умения и особенности'}.</p>}
                  {!editing && cfg.itemKind && editorTab === 'effects' && <p className="text-sm text-stone-500">Сначала создайте предмет, чтобы добавить эффекты.</p>}
                  {resource !== 'races' && editing && cfg.imageOps && <div hidden={tabHidden('main')}><ImageUploadBlock imageUrl={imageUrl} onUpload={uploadImage} onRemove={removeImage} busy={imageBusy} error={imageError} /></div>}
                  {(editorTabs ?? [['main', 'Основное']]).map(([tab, title]) => <div key={tab} hidden={tabHidden(tab)} role="tabpanel" aria-label={title}>
                  <div className={resource === 'races' && tab === 'main' ? 'race-editor-main' : ''}>
                  <div className="grid gap-4 sm:grid-cols-2" onInvalid={() => setEditorTab(tab)}>
                    {(() => {
                      const visibleFields = cfg.fields.filter(
                        (field) => catalogFieldTab(resource, field.key) === tab && !(field.showWhen && !field.showWhen(form))
                      )
                      const groups = []
                      for (let i = 0; i < visibleFields.length; i++) {
                        const field = visibleFields[i]
                        if (field.row) {
                          // Строка из нескольких полей (row): сетка в 4 колонки, full — на 2.
                          const row = [field]
                          while (visibleFields[i + 1]?.row === field.row) row.push(visibleFields[++i])
                          groups.push(Object.assign(row, { row: true }))
                        } else if (field.inline && visibleFields[i + 1]?.inline) {
                          groups.push([field, visibleFields[i + 1]])
                          i += 1
                        } else {
                          groups.push([field])
                        }
                      }
                      // Обязательное поле — со звёздочкой в подписи («Название *»).
                      const renderField = (rawField) => renderOne(rawField.required ? { ...rawField, label: `${rawField.label} *` } : rawField)
                      const renderOne = (field) =>
                        field.type === 'heading' ? (
                          <div key={field.key} className="pt-2 sm:col-span-2">
                            <SectionTitle>{field.label}</SectionTitle>
                            {field.hint && <p className="text-xs text-stone-500">{field.hint}</p>}
                          </div>
                        ) : field.type === 'abilityScore' ? (
                          // Требование черты: характеристика чипами и порог «не ниже N» рядом; бэк
                          // требует их вместе — выбор характеристики ставит 13, «Нет» снимает порог.
                          <div key={field.key} className="sm:col-span-2">
                            <Field label={field.label} group>
                              <div className="flex flex-wrap items-center gap-3">
                                <EditorFieldControl
                                  field={{ ...field, type: 'chips' }}
                                  value={form[field.key] ?? ''}
                                  onChange={(ability) => setForm((f) => ({ ...f, [field.key]: ability, [field.scoreKey]: ability ? f[field.scoreKey] || '13' : '' }))}
                                />
                                {form[field.key] && (
                                  <span className="flex items-center gap-2 text-sm text-stone-400">
                                    не ниже
                                    <EditorFieldControl
                                      field={{ type: 'stepper', label: 'Минимальное значение', min: 1, max: 30, required: true }}
                                      value={form[field.scoreKey]}
                                      onChange={setField(field.scoreKey)}
                                    />
                                  </span>
                                )}
                              </div>
                            </Field>
                          </div>
                        ) : field.type === 'rangePresets' ? (
                          <div key={field.key} className="sm:col-span-2">
                            <Field label={field.label} group>
                              <div role="group" aria-label={field.label} className="flex flex-wrap gap-2">
                                {field.presets.map(([normal, long]) => {
                                  const [normalKey, longKey] = field.keys
                                  const active = Number(form[normalKey]) === normal && Number(form[longKey]) === long
                                  return (
                                    <button
                                      key={`${normal}/${long}`}
                                      type="button"
                                      aria-pressed={active}
                                      className="catalog-filter-choice"
                                      onClick={() => setForm((f) => ({ ...f, [normalKey]: String(normal), [longKey]: String(long) }))}
                                    >
                                      {normal}/{long}
                                    </button>
                                  )
                                })}
                              </div>
                            </Field>
                          </div>
                        ) : field.type === 'dice' ? (
                          <div key={field.key} className="sm:col-span-2">
                            <DiceField
                              label={field.label}
                              count={field.countKey ? form[field.countKey] : 1}
                              type={form[field.typeKey] ?? ''}
                              withCount={!!field.countKey}
                              optional={field.optional}
                              aside={field.aside && (
                                <Field label={field.aside.label} group={GROUP_FIELD_TYPES.has(field.aside.type)}>
                                  <EditorFieldControl field={field.aside} value={form[field.aside.key]} onChange={setField(field.aside.key)} />
                                </Field>
                              )}
                              onChange={({ count, type }) => setForm((f) => ({
                                ...f,
                                ...(field.countKey && { [field.countKey]: count === '' ? '' : String(count) }),
                                [field.typeKey]: type,
                              }))}
                            />
                          </div>
                        ) : field.type === 'checkbox' ? (
                          <div key={field.key} className={`flex items-end ${field.span ? ROW_SPAN[field.span] : ''}`}>
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
                        ) : (field.type === 'textarea' || field.type === 'text') && editing ? (
                          // RichTextField/TextField рисуют свою метку и статус
                          // сохранения — без дополнительной обёртки Field, чтобы
                          // не дублировать label.
                          <div key={field.key} className={field.flex ? ROW_FLEX[field.flex] : field.span ? ROW_SPAN[field.span] : field.full ? 'sm:col-span-2' : ''}>
                            <EditorFieldControl field={field} value={form[field.key]} onSaveField={saveField(field.key)} />
                          </div>
                        ) : (
                          <div key={field.key} className={field.flex ? ROW_FLEX[field.flex] : field.span ? ROW_SPAN[field.span] : field.full ? 'sm:col-span-2' : ''}>
                            <Field label={field.label} group={GROUP_FIELD_TYPES.has(field.type)}>
                              <EditorFieldControl
                                field={field}
                                value={form[field.key]}
                                onChange={setField(field.key)}
                              />
                              {field.hint && <span className="text-xs text-stone-500">{field.hint}</span>}
                            </Field>
                          </div>
                        )
                      return groups.map((group) =>
                        group.row ? (
                          <div key={group.map((f) => f.key).join('-')} className={group.some((f) => f.flex) ? 'flex flex-wrap items-start gap-4 sm:col-span-2' : 'grid gap-4 sm:col-span-2 sm:grid-cols-4'}>
                            {group.map((field) => renderField(field))}
                          </div>
                        ) : group.length === 2 ? (
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

                  {resource === 'races' && tab === 'main' && editing && cfg.imageOps && <div className="race-editor-image"><ImageUploadBlock imageUrl={imageUrl} onUpload={uploadImage} onRemove={removeImage} busy={imageBusy} error={imageError} /></div>}
                  </div>
                  </div>)}

                  {cfg.sections
                    .filter((section) => {
                      if (section.hiddenOnEdit && editing) return false
                      if (section.showWhen && !section.showWhen(form)) return false
                      return true
                    })
                    .map((section) => {
                    if (section.type === 'spellSlots') {
                      return (
                        <SpellSlotsTable
                          key={section.key}
                          label={section.label}
                          value={form[section.key] ?? {}}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                        />
                      )
                    }
                    if (section.type === 'spellcasting') {
                      const ability = form[section.key] ?? ''
                      return (
                        <div key={section.key}>
                          <SectionTitle>{section.label}</SectionTitle>
                          <EditorFieldControl
                            field={{ type: 'chips', label: section.label, options: section.options ?? [] }}
                            value={ability}
                            onChange={(value) => {
                              const hasSlots = Object.values(form[section.slotsKey] ?? {}).some((row) => Object.values(row ?? {}).some((n) => Number(n) > 0))
                              if (!value && hasSlots) {
                                setConfirmClearSlots({ key: section.key, slotsKey: section.slotsKey })
                                return
                              }
                              setForm((f) => ({
                                ...f,
                                [section.key]: value,
                                ...(value ? {} : { [section.slotsKey]: {} }),
                              }))
                            }}
                          />
                          <p className="mt-1 text-xs text-stone-500">
                            {ability ? section.hint : section.chooseHint}
                          </p>
                        </div>
                      )
                    }
if (section.type === 'scaling') {
                      // Растущая строка пишется только через /features/{id} (черта — тоже особенность).
                      const saveScaling = async (scaling) => {
                        const updated = await api.features.update(editing.id, { scaling })
                        const next = updated?.scaling ?? null
                        setEditing((e) => (e ? { ...e, scaling: next } : e))
                        return next
                      }
                      return (
                        <div key={section.key}>
                          <CatalogScalingBlock
                            key={editing?.id ?? 'new'}
                            saved={editing?.scaling ?? null}
                            minLevel={toNum(form[section.levelKey])}
                            onSave={editing ? saveScaling : undefined}
                            onDraftChange={editing ? undefined : (draft) => setForm((f) => ({ ...f, [section.key]: draft }))}
                          />
                        </div>
                      )
                    }
if (section.type === 'effectsTree') {
                      return (
                        <FeatureEffectsEditor
                          drawer
                          key={`${section.key}-${section.part}`}
                          part={section.part}
                          summaryHtml={form.effects_summary}
                          value={form[section.key]}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                        />
                      )
                    }
                    if (section.type === 'groupedRows') {
                      return (
                        <GroupedRowsEditor
                          key={section.key}
                          section={section}
                          rows={form[section.key] ?? []}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                        />
                      )
                    }
                    if (section.type === 'weaponProperties') {
                      return (
                        <WeaponPropertiesPicker
                          key={section.key}
                          value={form[section.key] ?? []}
                          form={form}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                          onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                        />
                      )
                    }
                    if (section.type === 'itemEffects') {
                      return editing ? <ItemEffectsEditor key={`${section.key}-${editing.id}`} itemId={editing.id} item={editing} /> : null
                    }
                    if (section.type === 'tags') {
                      return (
                        <CatalogTagInput
                          key={section.key}
                          value={form[section.key] ?? []}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                        />
                      )
                    }
                    if (section.type === 'abilityBonuses') {
                      return (
                        <AbilityBonusesBlock
                          key={section.key}
                          label={section.label}
                          owner={form.name ? `раса «${form.name}»` : 'новая раса'}
                          value={form[section.key] ?? []}
                          onChange={(next) => setForm((f) => ({ ...f, [section.key]: next }))}
                        />
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
                          <SectionTitle
                            button={
                              <EditorAddButton onClick={() => addRow(section)} disabled={allUsed}>{section.addLabel.replace(/^\+\s*/, '')}</EditorAddButton>
                            }
                          >
                            {section.label}
                          </SectionTitle>
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
                                className="catalog-bonus-row"
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
                                        <RichTextEditor
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
                                      <BlurNumberInput
                                        min={col.min}
                                        max={col.max}
                                        value={row[col.key] ?? ''}
                                        onChange={(v) => setRow(section.key, i, col.key, Number(v))}
                                        className={
                                          section.fixedWidths
                                            ? 'input-narrow w-full sm:h-10'
                                            : `input-narrow w-24 sm:h-10 ${col.width ?? ''}`
                                        }
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
                                    onClick={() => editing ? setConfirmRow({ key: section.key, index: i }) : removeRow(section.key, i)}
                                    className="catalog-delete-button"
                                    title="Удалить"
                                  >
                                    <TrashIcon />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => editing ? setConfirmRow({ key: section.key, index: i }) : removeRow(section.key, i)}
                                    className="catalog-delete-button"
                                    title="Убрать"
                                  >
                                    <TrashIcon />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    const options =
                      section.type === 'pills' ? section.options : listOptions[section.listKey]
                    const picker = (
                      <OptionsPicker
                        drawer
                        key={section.key}
                        label={section.label}
                        hint={section.hint}
                        empty={section.empty}
                        options={options}
                        parentFilterLabel={{ subclasses: 'Класс', subraces: 'Раса' }[section.listKey]}
                        subheader={section.countKey && (
                          <ChoiceCountStepper
                            value={Number(form[section.countKey] ?? 0)}
                            max={Math.min(20, (form[section.key] ?? []).length)}
                            onChange={(n) => setForm((f) => ({ ...f, [section.countKey]: String(n) }))}
                          />
                        )}
                        selected={form[section.key]}
                        onToggle={toggleIn(section.key)}
                        onClear={() => setForm((f) => ({ ...f, [section.key]: [] }))}
                      />
                    )
                    const after = section.after
                    if (!after) return picker
                    return (
                      <div key={section.key} className="space-y-4">
                        {picker}
                        {editing ? (
                          <EditorFieldControl field={after} value={form[after.key]} onSaveField={saveField(after.key)} />
                        ) : (
                          <Field label={after.label}>
                            <EditorFieldControl field={after} value={form[after.key]} onChange={setField(after.key)} />
                          </Field>
                        )}
                      </div>
                    )
                  }).map((node) => node && <div key={node.key} hidden={tabHidden(catalogSectionTab(resource, node.key))}>{node}</div>)}
                  {fieldError && <ErrorBox error={fieldError} onRetry={() => {}} />}
                  {!editing && (
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={closeForm}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={fieldSaving}>
                        {fieldSaving ? 'Создаём…' : `Создать ${cfg.singular}`}
                      </Button>
                    </div>
                  )}
                </form>
                </div>

                {editing && cfg.featuresOps && (
                  <div hidden={tabHidden('features')}><FeaturesEditorBlock
                    compact
                    block={cfg.featuresBlock}
                    items={features}
                    loading={featuresLoading}
                    error={featuresError}
                    showLevel={cfg.featuresModal.showLevel}
                    onAdd={() => openFeatureModal(null, null)}
                    onEdit={(i) => openFeatureModal(null, i)}
                    onRemove={removeFeature}
                    onRetry={reloadFeatures}
                  /></div>
                )}

                {editing && cfg.itemsOps && (
                  <div hidden={tabHidden('items')}><ItemsEditorBlock
                    block={cfg.itemsBlock}
                    items={startingItems}
                    loading={startingItemsLoading}
                    error={startingItemsError}
                    onRetry={reloadItems}
                    onSaveItems={saveGrant}
                    choiceGroups={cfg.choiceGroupsOps ? choiceGroups : null}
                    choiceGroupsLoading={choiceGroupsLoading}
                    choiceGroupsError={choiceGroupsError}
                    onChoiceGroupsRetry={reloadChoiceGroups}
                    onSaveChoiceGroup={saveChoiceGroup}
                    onRemoveChoiceGroup={removeChoiceGroup}
                  /></div>
                )}

                {editing && cfg.hasSubclasses && (
                  <div hidden={tabHidden('subclasses')} className="mt-6">
                    <SectionTitle
                      button={
                        <EditorAddButton
                          onClick={openNewSub}
                          aria-label="Добавить подкласс"
                        >
                          Добавить
                        </EditorAddButton>
                      }
                    >
                      Подклассы (архетипы)
                    </SectionTitle>
                    {subError && <ErrorBox error={subError} onRetry={() => reloadSubclasses(editing.id)} />}

                    {newSub && (
                      <Drawer title="Новый подкласс" subtitle={`Класс: ${editing.name}`} className="catalog-editor-drawer" closeLabel="Закрыть создание подкласса" onClose={() => setNewSub(null)} footer={<>
                        <Button type="button" variant="ghost" onClick={() => setNewSub(null)}>Отмена</Button>
                        <Button type="button" disabled={newSubSaving || !newSub.name.trim()} onClick={saveNewSub}>{newSubSaving ? 'Создаём…' : 'Создать'}</Button>
                      </>}>
                        <div className="space-y-4">
                          {newSubError && <ErrorBox error={newSubError} />}
                          <Field label="Название подкласса"><Input value={newSub.name} onChange={setNewSubField('name')} placeholder="Например, Школа Воплощения" /></Field>
                          <Field label="Описание"><RichTextEditor value={newSub.description} onChange={setNewSubField('description')} rows={4} /></Field>
                        </div>
                      </Drawer>
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
                              className="editor-record-card catalog-subrace-card"
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSub(sub.id)}
                                  aria-haspopup="dialog"
                                  className="catalog-card-open flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                                >
                                  <span className="truncate text-base font-medium text-stone-100">
                                    {info.detail?.name ?? sub.name}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmSub(sub)}
                                  className="catalog-delete-button relative z-[1]"
                                  title="Удалить"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                              {open && (
                                <Drawer title={info.detail?.name ?? sub.name} subtitle={`Класс: ${editing.name}`} className="catalog-editor-drawer" closeLabel="Закрыть подкласс" onClose={() => setOpenSubs(new Set())} footer={<Button type="button" variant="ghost" onClick={() => setOpenSubs(new Set())}>Готово</Button>}>
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
                                      onRefresh={() => {
                                        invalidateResource()
                                        return reloadSubDetail(sub.id)
                                      }}
                                    />
                                  ) : null}
                                </Drawer>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {editing && cfg.hasSubraces && (
                  <div hidden={tabHidden('subraces')} className="mt-6">
                    <SectionTitle
                      button={
                        <EditorAddButton onClick={openNewSubrace} aria-label="Добавить подрасу">Добавить</EditorAddButton>
                      }
                    >
                      Подрасы <span className="text-stone-500">{subraces.length}</span>
                    </SectionTitle>
                    {subraceError && <ErrorBox error={subraceError} onRetry={() => reloadSubraces(editing.id)} />}

                    {newSubrace && (
                      <Drawer title="Новая подраса" subtitle={`Раса: ${editing.name}`} className="catalog-editor-drawer" closeLabel="Закрыть создание подрасы" onClose={() => setNewSubrace(null)} footer={<>
                        <Button type="button" variant="ghost" onClick={() => setNewSubrace(null)}>Отмена</Button>
                        <Button type="button" disabled={newSubraceSaving || !newSubrace.name.trim()} onClick={saveNewSubrace}>{newSubraceSaving ? 'Создаём…' : 'Создать'}</Button>
                      </>}>
                        <div className="space-y-4">
                          {newSubraceError && <ErrorBox error={newSubraceError} />}
                          <Field label="Название подрасы"><Input value={newSubrace.name} onChange={setNewSubraceField('name')} placeholder="Например, Высший эльф" /></Field>
                          <Field label="Описание"><RichTextEditor value={newSubrace.description} onChange={setNewSubraceField('description')} rows={4} /></Field>
                        </div>
                      </Drawer>
                    )}

                    {subraces.length === 0 && !newSubrace ? (
                      <p className="text-sm text-stone-500">Подрас нет</p>
                    ) : (
                      <div className="space-y-3">
                        {subraces.map((sub) => {
                          const info = subraceDetails[sub.id] ?? {}
                          const open = openSubraces.has(sub.id)
                          const subImage = info.detail ? info.detail.image_url : sub.image_url
                          return (
                            <div
                              key={sub.id}
                              className="editor-record-card catalog-subrace-card"
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSubrace(sub.id)}
                                  aria-haspopup="dialog"
                                  className="catalog-card-open flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                                >
                                  {subImage && <img src={subImage} alt="" className="catalog-subrace-image" />}
                                  <span className="truncate text-base font-medium text-stone-100">
                                    {info.detail?.name ?? sub.name}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmSubrace(sub)}
                                  className="catalog-delete-button relative z-[1]"
                                  title="Удалить"
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                              {open && (
                                <Drawer title={info.detail?.name ?? sub.name} subtitle={`Раса: ${editing.name}`} className="catalog-editor-drawer" closeLabel="Закрыть подрасу" onClose={() => setOpenSubraces(new Set())} footer={<Button type="button" variant="ghost" onClick={() => setOpenSubraces(new Set())}>Готово</Button>}>
                                  <p className="catalog-parent-context">Базовая раса: {editing.name} · {cfg.listBadges(editing).map((badge) => badge.text).join(' · ')}</p>
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
                                      onRefresh={() => {
                                        invalidateResource()
                                        return reloadSubraceDetail(sub.id)
                                      }}
                                    />
                                  ) : null}
                                </Drawer>
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
              <Card className="p-6" aria-busy="true">
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
              <Card className="editor-welcome">
                <span className="editor-welcome-eyebrow">{cfg.label}</span>
                <h2>Выберите запись для редактирования</h2>
                <p>Откройте запись из списка или создайте новую. Поиск и фильтры помогут найти нужную запись.</p>
                <Button onClick={openCreate}>+ Создать запись</Button>
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
            drawer
            title={
              featureModal.index == null
                ? `Добавить ${cfg.featuresBlock.noun}`
                : `Изменить: ${row?.name || cfg.featuresBlock.noun}`
            }
            subtitle={resource === 'races' ? `Раса: ${editing?.name}` : editing?.name}
            value={row}
            showLevel={cfg.featuresModal.showLevel}
            levelRequired={cfg.featuresModal.levelRequired}
            onSave={saveFeature}
            onSaved={() => {
              invalidateResource()
              return reloadFeatures()
            }}
            onClose={() => setFeatureModal(null)}
          />
        )
      })()}


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

      {confirmClearSlots && (
        <ConfirmDialog
          title="Удалить ячейки заклинаний?"
          message="Без характеристики заклинаний класс не колдует: все ячейки заклинаний по уровням удалятся при сохранении."
          onCancel={() => setConfirmClearSlots(null)}
          onConfirm={() => {
            const { key, slotsKey } = confirmClearSlots
            setForm((f) => ({ ...f, [key]: '', [slotsKey]: {} }))
            setConfirmClearSlots(null)
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
