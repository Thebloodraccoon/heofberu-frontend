// Design-sync reference composition — NOT the real app page verbatim (that's
// src/features/catalog/pages/GmEditorPage.jsx, 1586 lines, a config-driven
// editor for 8 catalog resources with entirely local/imperative state — no
// React Query). Scoped to the 'races' resource only (the page's default
// selection) as a representative example of the editor pattern; the other 7
// resources use different section types (spellSlots, spellcasting, etc.) not
// covered here. Reuses the REAL editorConfig.races (fields/sections/
// listBadges/fromRecord — all pure functions, safe to call) and the real
// editor sub-components (EditorFieldControl, FeaturesEditorBlock,
// RecordListItem, SubraceEditor), with mock records instead of api.races.*
// calls feeding the initial state.
import { useState } from 'react'
import { editorConfig } from '@/features/catalog/config/editors/index.js'
import EditorFieldControl, { SectionTitle, TrashIcon } from '@/features/catalog/components/editor/editorShared.jsx'
import FeaturesEditorBlock from '@/features/catalog/components/editor/FeaturesEditorBlock.jsx'
import RecordListItem from '@/features/catalog/components/editor/RecordListItem.jsx'
import SubraceEditor from '@/features/catalog/components/editor/SubraceEditor.jsx'
import ImageUploadBlock from '@/features/catalog/components/editor/ImageUploadBlock.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'
import { Button, Card, Field, Input, PageHeader, PillToggle, Select } from '@/components/ui'
import { PAGE_SIZE } from '@/features/catalog/catalog.js'

const cfg = editorConfig.races

const RACES_LIST = [
  { id: 1, name: 'Дворф', size: 'MEDIUM', speed: 25 },
  { id: 2, name: 'Эльф', size: 'MEDIUM', speed: 30 },
  { id: 3, name: 'Человек', size: 'MEDIUM', speed: 30 },
  { id: 4, name: 'Полурослик', size: 'SMALL', speed: 25 },
]

const RACE_DETAIL = {
  id: 1,
  name: 'Дворф',
  size: 'MEDIUM',
  speed: 25,
  description: 'Крепкий и выносливый народ, живущий в горных чертогах глубоко под землёй.',
  ability_bonuses: [{ ability: 'CON', bonus: 2 }],
  granted_skills: [{ id: 1 }],
}

const RACE_FEATURES = [
  { id: 201, name: 'Тёмное зрение', description: 'Вы видите в темноте на расстоянии 18 метров, как при тусклом свете.', level: null, ability_increases: [] },
  { id: 202, name: 'Стойкость дворфов', description: 'Преимущество на спасброски против яда, и сопротивление к урону ядом.', level: null, ability_increases: [] },
]

const RACE_SUBRACES = [{ id: 11, name: 'Дворф-горец' }, { id: 12, name: 'Дворф-холмовик' }]
const SUBRACE_DETAIL = {
  id: 11,
  name: 'Дворф-горец',
  description: 'Крепкие воины гор, привыкшие к суровому климату вершин.',
  ability_bonuses: [{ ability: 'STR', bonus: 2 }],
}
const SUBRACE_FEATURES = [
  { id: 111, name: 'Боевое обучение дворфов', description: 'Владение боевым топором, ручным топором, лёгким и боевым молотом.' },
]

const SKILLS_CATALOG = [{ id: 1, name: 'Атлетика' }, { id: 13, name: 'Восприятие' }, { id: 14, name: 'Выживание' }]
const listOptions = { skills: SKILLS_CATALOG.map((s) => ({ value: s.id, label: s.name })) }

function Page({ initiallyEditing }) {
  const [showForm, setShowForm] = useState(initiallyEditing)
  const [editing, setEditing] = useState(initiallyEditing ? RACE_DETAIL : null)
  const [selectedId, setSelectedId] = useState(initiallyEditing ? RACE_DETAIL.id : null)
  const [form, setForm] = useState(initiallyEditing ? cfg.fromRecord(RACE_DETAIL) : null)
  const [openSubraces, setOpenSubraces] = useState(() => new Set(initiallyEditing ? [11] : []))

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const toggleIn = (key) => (value) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }))
  const setRow = (key, i, colKey, v) =>
    setForm((f) => ({ ...f, [key]: f[key].map((row, idx) => (idx === i ? { ...row, [colKey]: v } : row)) }))
  const addRow = (section) => setForm((f) => ({ ...f, [section.key]: [...(f[section.key] ?? []), { ...section.defaults }] }))
  const removeRow = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, idx) => idx !== i) }))

  const openEdit = (rec) => {
    // This reference composition only carries full mock detail for race #1 —
    // selecting any record shows that same detail, matching how the real
    // page would look once its api.races.get(rec.id) resolved.
    setSelectedId(rec.id)
    setShowForm(true)
    setEditing(RACE_DETAIL)
    setForm(cfg.fromRecord(RACE_DETAIL))
    setOpenSubraces(new Set([11]))
  }
  const openCreate = () => {
    setEditing(null)
    setSelectedId(null)
    setForm(cfg.emptyForm())
    setShowForm(true)
    setOpenSubraces(new Set())
  }
  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setSelectedId(null)
    setForm(null)
  }
  const toggleSubrace = (id) =>
    setOpenSubraces((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      <PageHeader
        title="Редактор справочников"
        subtitle="Создание, изменение и удаление записей всех справочников"
        actions={<Button onClick={openCreate}>+ Новая запись</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input readOnly placeholder="Поиск: имя, описание..." className="input-search w-full sm:w-80" />
        <button type="button" className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 py-2.5 text-sm font-medium text-stone-200">⌕</button>
        <button type="button" className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 py-2.5 text-sm font-medium text-stone-200">Фильтр</button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {Object.entries(editorConfig).map(([key, c]) => (
          <button
            key={key}
            type="button"
            className={`flex shrink-0 items-center gap-2 rounded px-3.5 py-2 text-sm font-medium transition ${
              key === 'races' ? 'bg-ember text-white shadow-sm' : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100vh-280px)] min-h-0 flex-col overflow-hidden lg:sticky lg:top-24">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {RACES_LIST.map((it) => (
              <RecordListItem key={it.id} item={it} selectedId={selectedId} badges={cfg.listBadges(it)} onEdit={openEdit} />
            ))}
          </div>
          <div className="shrink-0">
            <Pagination page={1} total={RACES_LIST.length} size={PAGE_SIZE} onPage={() => {}} />
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
                    <Button type="button" variant="danger" size="sm" className="my-[5px]">
                      <TrashIcon className="mr-1.5 inline h-3.5 w-3.5" />
                      Удалить...
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
                {editing && cfg.imageOps && (
                  <ImageUploadBlock imageUrl={null} onUpload={async () => {}} onRemove={() => {}} busy={false} error={null} />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {cfg.fields.map((field) => (
                    <div key={field.key} className={field.full ? 'sm:col-span-2' : ''}>
                      <Field label={field.label}>
                        <EditorFieldControl field={field} value={form[field.key]} onChange={setField(field.key)} />
                      </Field>
                    </div>
                  ))}
                </div>

                {cfg.sections.map((section) => {
                  if (section.type === 'rows') {
                    const selCol = section.columns.find((c) => c.type === 'select')
                    const used = selCol ? new Set(form[section.key].map((r) => r[selCol.key])) : null
                    return (
                      <div key={section.key}>
                        <SectionTitle
                          button={
                            <button
                              type="button"
                              onClick={() => addRow(section)}
                              className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
                            >
                              {section.addLabel}
                            </button>
                          }
                        >
                          {section.label}
                        </SectionTitle>
                        {form[section.key].length === 0 && <p className="text-sm text-stone-500">{section.empty}</p>}
                        <div className="flex flex-wrap gap-2">
                          {form[section.key].map((row, i) => (
                            <div key={i} className="flex w-[calc(50%-0.5rem)] min-w-[260px] items-center gap-2">
                              {section.columns.map((col) => (
                                <div key={col.key} className={col.width ?? 'flex-1'}>
                                  {col.type === 'select' ? (
                                    <Select value={row[col.key]} onChange={(e) => setRow(section.key, i, col.key, e.target.value)} className="w-full">
                                      {col.options.map((o) => (
                                        <option key={o.value} value={o.value} disabled={used?.has(o.value) && o.value !== row[col.key]}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </Select>
                                  ) : (
                                    <Input
                                      type="number"
                                      min={col.min}
                                      max={col.max}
                                      value={row[col.key]}
                                      onChange={(e) => setRow(section.key, i, col.key, Number(e.target.value))}
                                      className="w-full"
                                    />
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => removeRow(section.key, i)}
                                className="my-[5px] inline-flex h-[40px] w-[40px] items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                                title="Удалить"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  }
                  const options = section.type === 'pills' ? section.options : listOptions[section.listKey]
                  return (
                    <div key={section.key}>
                      <SectionTitle>{section.label}</SectionTitle>
                      {options.length === 0 ? (
                        <p className="text-sm text-stone-500">{section.empty}</p>
                      ) : (
                        <PillToggle options={options} selected={form[section.key]} onToggle={toggleIn(section.key)} />
                      )}
                    </div>
                  )
                })}

                <div className="flex flex-wrap items-center gap-2 pt-4">
                  <Button type="submit">{editing ? 'Обновить поля' : 'Создать'}</Button>
                  <Button type="button" variant="ghost" onClick={closeForm}>Отмена</Button>
                </div>
              </form>

              {editing && cfg.featuresOps && (
                <FeaturesEditorBlock
                  block={cfg.featuresBlock}
                  items={RACE_FEATURES}
                  loading={false}
                  error={null}
                  showLevel={cfg.featuresModal.showLevel}
                  onAdd={() => {}}
                  onEdit={() => {}}
                  onRemove={() => {}}
                  onRetry={() => {}}
                />
              )}

              {editing && cfg.hasSubraces && (
                <div className="mt-6">
                  <SectionTitle
                    button={
                      <button type="button" className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800">
                        + Добавить
                      </button>
                    }
                  >
                    Подрасы
                  </SectionTitle>
                  <div className="space-y-3">
                    {RACE_SUBRACES.map((sub) => {
                      const open = openSubraces.has(sub.id)
                      return (
                        <div key={sub.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60">
                          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => toggleSubrace(sub.id)}
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                            >
                              <span className={`text-xs text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                              <span className="truncate text-base font-medium text-stone-100">{sub.name}</span>
                            </button>
                            <button
                              type="button"
                              className="my-[5px] inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                              title="Удалить"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          {open && (
                            <div className="border-t border-stone-700/60 p-4">
                              {sub.id === 11 ? (
                                <SubraceEditor raceId={editing.id} detail={SUBRACE_DETAIL} features={SUBRACE_FEATURES} onRefresh={async () => {}} />
                              ) : (
                                <p className="text-sm text-stone-500">Загружаем подрасу...</p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <p className="font-display text-lg font-bold text-stone-300">Редактор {cfg.label.toLowerCase()}</p>
              <p className="mt-2 text-sm text-stone-500">Выберите запись в списке слева, чтобы изменить её, или нажмите «+ Новая запись».</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

/**
 * GM catalog editor, scoped to the 'races' resource as a representative
 * example (the real page supports 8 catalog resources, each with its own
 * field/section config). Pass `initiallyEditing` to open race #1's edit form
 * (with a subrace expanded) instead of the empty "select a record" state.
 */
export function GmEditorPage({ initiallyEditing = false }) {
  return <Page initiallyEditing={initiallyEditing} />
}
