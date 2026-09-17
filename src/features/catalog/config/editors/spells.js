import { catalogApi as api } from '../../api.js'
import {
  abilityLabels,
  attackTypeLabels,
  componentLabels,
  damageTypeLabels,
  diceTypeLabels,
  healingTargetLabels,
  spellCastTimeLabels,
  spellDurationLabels,
  spellLevelLabels,
  spellRangeLabels,
  spellSchoolLabels,
} from '@/lib/i18n/index.js'
import { opt, optOptional, toNum, toStr } from './shared.js'

const hasDamage = (f) =>
  Boolean(f.damage_type || f.damage_dice_type || toNum(f.damage_dice_count) > 0)
const hasHeal = (f) =>
  Boolean(f.healing_target || f.healing_dice_type || toNum(f.healing_dice_count) > 0)

const buildSpellBase = (f) => {
  const base = {
    name: f.name,
    level: f.level,
    school: f.school,
    cast_time: f.cast_time,
    range_type: f.range_type,
    range_value: toNum(f.range_value),
    duration: f.duration,
    is_concentration: f.is_concentration,
    is_ritual: f.is_ritual,
    is_material_consumed: f.is_material_consumed,
    material: f.material,
    attack_type: f.attack_type || null,
    save_stat: f.save_stat || null,
    damage_type: f.damage_type || null,
    damage_dice_count: toNum(f.damage_dice_count),
    damage_dice_type: f.damage_dice_type || null,
    healing_target: f.healing_target || null,
    healing_dice_count: toNum(f.healing_dice_count),
    healing_dice_type: f.healing_dice_type || null,
    description: f.description,
    higher_levels: f.higher_levels,
    components: f.components,
  }
  if (hasHeal(f)) {
    base.attack_type = null
    base.save_stat = null
    base.damage_type = null
    base.damage_dice_count = 0
    base.damage_dice_type = null
  }
  if (hasDamage(f)) {
    base.healing_target = null
    base.healing_dice_count = 0
    base.healing_dice_type = null
  }
  return base
}

export const spellsCfg = {
  singular: 'заклинание',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Огненный шар', full: true },
    { key: 'level', label: 'Уровень', type: 'select', options: opt(spellLevelLabels) },
    { key: 'school', label: 'Школа', type: 'select', options: opt(spellSchoolLabels) },
    { key: 'cast_time', label: 'Время накладывания', type: 'select', options: opt(spellCastTimeLabels) },
    { key: 'range_type', label: 'Дистанция', type: 'select', options: opt(spellRangeLabels) },
    { key: 'range_value', label: 'Дистанция (значение)', type: 'number', min: 0 },
    { key: 'duration', label: 'Длительность', type: 'select', options: opt(spellDurationLabels) },
    { key: 'is_concentration', label: 'Концентрация', type: 'checkbox' },
    { key: 'is_ritual', label: 'Ритуал', type: 'checkbox' },
    { key: 'is_material_consumed', label: 'Материал расходуется', type: 'checkbox', showWhen: (f) => f.components?.includes('MATERIAL') || Boolean(f.material) },
    { key: 'material', label: 'Материальные компоненты', type: 'text', placeholder: 'Например: капля драконьей крови' },
    { key: 'attack_type', label: 'Тип атаки', type: 'select', options: optOptional(attackTypeLabels), showWhen: (f) => !hasHeal(f) },
    { key: 'save_stat', label: 'Характеристика спасброска', type: 'select', options: optOptional(abilityLabels), showWhen: (f) => !hasHeal(f) },
    { key: 'damage_type', label: 'Тип урона', type: 'select', options: optOptional(damageTypeLabels), showWhen: (f) => !hasHeal(f) },
    { key: 'damage_dice_count', label: 'Количество костей урона', type: 'number', min: 0, showWhen: (f) => !hasHeal(f) },
    { key: 'damage_dice_type', label: 'Кость урона', type: 'select', options: optOptional(diceTypeLabels), showWhen: (f) => !hasHeal(f) },
    { key: 'healing_target', label: 'Лечение', type: 'select', options: optOptional(healingTargetLabels), showWhen: (f) => hasHeal(f) || !hasDamage(f) },
    { key: 'healing_dice_count', label: 'Количество костей лечения', type: 'number', min: 0, showWhen: (f) => hasHeal(f) || !hasDamage(f) },
    { key: 'healing_dice_type', label: 'Кость лечения', type: 'select', options: optOptional(diceTypeLabels), showWhen: (f) => hasHeal(f) || !hasDamage(f) },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
    { key: 'higher_levels', label: 'На более высоких уровнях', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'pills', key: 'components', label: 'Компоненты', options: opt(componentLabels), empty: 'Не выбрано' },
    { type: 'pillsFrom', listKey: 'classes', key: 'class_ids', label: 'Доступно классам (пусто — без ограничений)', empty: 'Классов в справочнике нет' },
    { type: 'pillsFrom', listKey: 'subclasses', key: 'subclass_ids', label: 'Доступно подклассам (пусто — без ограничений)', empty: 'Подклассов в справочнике нет' },
    { type: 'pillsFrom', listKey: 'races', key: 'race_ids', label: 'Доступно расам (пусто — без ограничений)', empty: 'Рас в справочнике нет' },
    { type: 'pillsFrom', listKey: 'subraces', key: 'subrace_ids', label: 'Доступно подрасам (пусто — без ограничений)', empty: 'Подрас в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    level: 'CANTRIP',
    school: 'ABJURATION',
    cast_time: 'ACTION',
    range_type: 'SELF',
    range_value: '',
    duration: 'INSTANTANEOUS',
    is_concentration: false,
    is_ritual: false,
    is_material_consumed: false,
    material: '',
    attack_type: '',
    save_stat: '',
    damage_type: '',
    damage_dice_count: '',
    damage_dice_type: '',
    healing_target: '',
    healing_dice_count: '',
    healing_dice_type: '',
    description: '',
    higher_levels: '',
    components: [],
    class_ids: [],
    subclass_ids: [],
    race_ids: [],
    subrace_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    level: r.level,
    school: r.school,
    cast_time: r.cast_time,
    range_type: r.range_type,
    range_value: toStr(r.range_value),
    duration: r.duration,
    is_concentration: !!r.is_concentration,
    is_ritual: !!r.is_ritual,
    is_material_consumed: !!r.is_material_consumed,
    material: r.material ?? '',
    attack_type: r.attack_type ?? '',
    save_stat: r.save_stat ?? '',
    damage_type: r.damage_type ?? '',
    damage_dice_count: toStr(r.damage_dice_count),
    damage_dice_type: r.damage_dice_type ?? '',
    healing_target: r.healing_target ?? '',
    healing_dice_count: toStr(r.healing_dice_count),
    healing_dice_type: r.healing_dice_type ?? '',
    description: r.description ?? '',
    higher_levels: r.higher_levels ?? '',
    components: r.components ?? [],
    class_ids: (r.available_classes ?? []).map((c) => c.id),
    subclass_ids: (r.available_subclasses ?? []).map((c) => c.id),
    race_ids: (r.available_races ?? []).map((x) => x.id),
    subrace_ids: (r.available_subraces ?? []).map((x) => x.id),
  }),
  submitFields: async (form, rec) => {
    const base = buildSpellBase(form)
    if (!rec) {
      await api.spells.create({
        ...base,
        available_classes: form.class_ids,
        available_subclasses: form.subclass_ids,
        available_races: form.race_ids,
        available_subraces: form.subrace_ids,
      })
      return
    }
    // Диффим по секциям, чтобы автосейв не слал лишних запросов при правке
    // одного блока (напр., только класса) — PATCH базы и остальные PUT улетают
    // только если соответствующая секция реально изменилась.
    const prevForm = spellsCfg.fromRecord(rec)
    const normIds = (arr) => arr.map(Number).sort()
    const idsChanged = (key) =>
      JSON.stringify(normIds(form[key])) !== JSON.stringify(normIds(prevForm[key]))
    if (JSON.stringify(base) !== JSON.stringify(buildSpellBase(prevForm))) {
      await api.spells.update(rec.id, base)
    }
    if (idsChanged('class_ids')) await api.spells.classes(rec.id, { class_ids: form.class_ids })
    if (idsChanged('subclass_ids')) await api.spells.subclasses(rec.id, { subclass_ids: form.subclass_ids })
    if (idsChanged('race_ids')) await api.spells.races(rec.id, { race_ids: form.race_ids })
    if (idsChanged('subrace_ids')) await api.spells.subraces(rec.id, { subrace_ids: form.subrace_ids })
  },
  listBadges: (item) =>
    [
      item.level ? { text: spellLevelLabels[item.level] ?? item.level, tone: 'accent' } : null,
      item.school ? { text: spellSchoolLabels[item.school] ?? item.school, tone: 'default' } : null,
    ].filter(Boolean),
}
