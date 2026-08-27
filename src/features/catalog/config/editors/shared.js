import { catalogApi as api } from '../../api.js'

export const opt = (map) => Object.entries(map).map(([value, label]) => ({ value, label }))
export const optOptional = (map) => [{ value: '', label: '—' }, ...opt(map)]

export const toNum = (v) => (v === '' || v == null ? null : Number(v))
export const toNumDefault = (v, def) => (v === '' || v == null ? def : Number(v))
export const toStr = (v) => (v == null ? '' : String(v))

export const SPELL_LEVEL_KEYS = [
  'CANTRIP',
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3',
  'LEVEL_4',
  'LEVEL_5',
  'LEVEL_6',
  'LEVEL_7',
  'LEVEL_8',
  'LEVEL_9',
]

const normSlots = (slots) =>
  SPELL_LEVEL_KEYS.filter((k) => (slots?.[k] ?? 0) > 0)
    .map((k) => `${k}:${Number(slots[k])}`)
    .join('|')

export const buildSpellSlotPayload = (spellSlots) =>
  Object.entries(spellSlots || {})
    .map(([classLevel, slots]) => ({
      class_level: Number(classLevel),
      slots: SPELL_LEVEL_KEYS.filter((k) => (slots?.[k] ?? 0) > 0).map((k) => ({
        spell_level: k,
        slots: Number(slots[k]),
      })),
    }))
    .filter((entry) => entry.slots.length > 0)

export const featurePayload = (f) => ({
  name: f.name,
  description: f.description ?? '',
  level: f.level ?? null,
})

const byLevelThenName = (a, b) => {
  const la = a.level ?? Number.POSITIVE_INFINITY
  const lb = b.level ?? Number.POSITIVE_INFINITY
  if (la !== lb) return la - lb
  return (a.name ?? '').localeCompare(b.name ?? '', 'ru')
}

export const sortedByLevel = (list) => [...(list ?? [])].sort(byLevelThenName)

export const featuresFromRecord = (r) =>
  (Array.isArray(r) ? r : r?.features ?? [])
    .map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description ?? '',
      level: f.level ?? null,
    }))
    .sort(byLevelThenName)

export const subclassFromRecord = (s) => ({
  id: s.id,
  name: s.name,
  description: s.description ?? '',
})

export const subclassPayload = (s) => ({
  name: s.name,
  description: s.description ?? '',
})

export const subracePayload = (s) => ({
  name: s.name,
  description: s.description ?? '',
})

export const saveSpellSlots = async (form, rec, existingProgression) => {
  const formSlots = form.spell_slots ?? {}
  const existingByLevel = {}
  for (const row of existingProgression ?? []) {
    if (!existingByLevel[row.class_level]) existingByLevel[row.class_level] = {}
    existingByLevel[row.class_level][row.spell_level] = row.slots
  }
  const levels = new Set([...Object.keys(formSlots), ...Object.keys(existingByLevel)].map(Number))
  for (const level of levels) {
    const now = formSlots[level] ?? {}
    const prev = existingByLevel[level] ?? {}
    if (normSlots(now) !== normSlots(prev)) {
      await api.classes.spellSlots(rec.id, level, {
        slots: SPELL_LEVEL_KEYS.filter((k) => (now[k] ?? 0) > 0).map((k) => ({
          spell_level: k,
          slots: Number(now[k]),
        })),
      })
    }
  }
}
