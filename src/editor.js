import { api } from './api/endpoints.js'
import { catalog } from './catalog.js'
import {
  abilityLabels,
  attackTypeLabels,
  componentLabels,
  damageTypeLabels,
  diceTypeLabels,
  healingTargetLabels,
  itemRarityLabels,
  itemTypeLabels,
  raceSizeLabels,
  spellCastTimeLabels,
  spellDurationLabels,
  spellLevelLabels,
  spellRangeLabels,
  spellSchoolLabels,
} from './labels.js'

const opt = (map) => Object.entries(map).map(([value, label]) => ({ value, label }))
const optOptional = (map) => [{ value: '', label: '—' }, ...opt(map)]

const toNum = (v) => (v === '' || v == null ? null : Number(v))
const toNumDefault = (v, def) => (v === '' || v == null ? def : Number(v))
const toStr = (v) => (v == null ? '' : String(v))

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
  is_homebrew: !!f.is_homebrew,
})

export const featuresFromRecord = (r) =>
  (Array.isArray(r) ? r : r?.features ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description ?? '',
    level: f.level ?? null,
    is_homebrew: !!f.is_homebrew,
  }))

const subclassFromRecord = (s) => ({
  id: s.id,
  name: s.name,
  archetype_group_name: s.archetype_group_name ?? '',
  unlock_level: toStr(s.unlock_level ?? 3),
  description: s.description ?? '',
  is_homebrew: !!s.is_homebrew,
})

export const subclassPayload = (s) => ({
  name: s.name,
  archetype_group_name: s.archetype_group_name || null,
  unlock_level: toNumDefault(s.unlock_level, 3),
  description: s.description ?? '',
  is_homebrew: !!s.is_homebrew,
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

const racesCfg = {
  singular: 'раса',
  featuresSource: { type: 'RACE', fk: 'race_id' },
  featuresOps: api.races.features,
  featuresModal: { showLevel: false, levelHint: '' },
  featuresBlock: {
    label: 'Особенности и умения расы',
    addLabel: '+ Добавить особенность',
    empty: 'Особенностей и умений нет',
    noun: 'особенность',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Эльф' },
    { key: 'size', label: 'Размер', type: 'select', options: opt(raceSizeLabels) },
    { key: 'speed', label: 'Скорость (фт.)', type: 'number', min: 0 },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_bonuses',
      label: 'Бонусы характеристик',
      addLabel: '+ Добавить',
      empty: 'Бонусов нет',
      defaults: { ability: 'STR', bonus: 1 },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels) },
        { key: 'bonus', label: 'Бонус', type: 'number', min: -5, max: 5, width: 'w-24' },
      ],
    },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки расы', empty: 'Навыков в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    size: 'MEDIUM',
    speed: '30',
    is_homebrew: false,
    description: '',
    ability_bonuses: [],
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    size: r.size,
    speed: toStr(r.speed ?? 30),
    is_homebrew: !!r.is_homebrew,
    description: r.description ?? '',
    ability_bonuses: (r.ability_bonuses ?? []).map((b) => ({ ability: b.ability, bonus: b.bonus })),
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      size: form.size,
      speed: toNumDefault(form.speed, 30),
      is_homebrew: form.is_homebrew,
      description: form.description,
    }
    if (rec) {
      await api.races.update(rec.id, base)
      await api.races.abilityBonuses(rec.id, { ability_bonuses: form.ability_bonuses })
      await api.races.skills(rec.id, { skill_ids: form.skill_ids })
    } else {
      return api.races.create({
        ...base,
        ability_bonuses: form.ability_bonuses,
        granted_skills: form.skill_ids,
      })
    }
  },
  listBadges: (item) =>
    [
      item.size ? { text: raceSizeLabels[item.size] ?? item.size, tone: 'default' } : null,
      item.speed != null ? { text: `${item.speed} фт.`, tone: 'default' } : null,
    ].filter(Boolean),
}

const classesCfg = {
  singular: 'класс',
  featuresSource: { type: 'CLASS', fk: 'class_id' },
  featuresOps: api.classes.features,
  featuresModal: {
    showLevel: true,
    levelHint: 'Укажите уровень, с которого умение доступно, или оставьте пустым — тогда оно доступно сразу.',
  },
  featuresBlock: {
    label: 'Умения класса',
    addLabel: '+ Добавить умение',
    empty: 'Умений нет',
    noun: 'умение',
  },
  hasSubclasses: true,
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Волшебник' },
    { key: 'hit_dice', label: 'Кость хитов', type: 'select', options: opt(diceTypeLabels) },
    { key: 'skill_choice_count', label: 'Количество навыков', type: 'number', min: 0 },
    { key: 'spellcasting_ability', label: 'Характеристика заклинаний', type: 'select', options: optOptional(abilityLabels) },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'pills', key: 'primary_abilities', label: 'Основные характеристики', options: opt(abilityLabels), empty: 'Не выбрано' },
    { type: 'pills', key: 'saving_throws', label: 'Спасброски', options: opt(abilityLabels), empty: 'Не выбрано' },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Доступные навыки', empty: 'Навыков в справочнике нет' },
    {
      type: 'spellSlots',
      key: 'spell_slots',
      label: 'Ячейки заклинаний по уровням',
      empty: 'Ячеек нет',
      showWhen: (form) => !!form.spellcasting_ability,
    },
  ],
  emptyForm: () => ({
    name: '',
    hit_dice: 'D8',
    skill_choice_count: '2',
    spellcasting_ability: '',
    is_homebrew: false,
    description: '',
    primary_abilities: [],
    saving_throws: [],
    skill_ids: [],
    spell_slots: {},
  }),
  fromRecord: (r) => ({
    name: r.name,
    hit_dice: r.hit_dice,
    skill_choice_count: toStr(r.skill_choice_count ?? 2),
    spellcasting_ability: r.spellcasting_ability ?? '',
    is_homebrew: !!r.is_homebrew,
    description: r.description ?? '',
    primary_abilities: (r.primary_abilities ?? []).map((p) => p.ability),
    saving_throws: (r.saving_throws ?? []).map((s) => s.ability),
    skill_ids: (r.available_skills ?? []).map((s) => s.id),
    spell_slots: (r.spell_slot_progression ?? []).reduce((acc, row) => {
      acc[row.class_level] = acc[row.class_level] || {}
      acc[row.class_level][row.spell_level] = row.slots
      return acc
    }, {}),
    subclasses: (r.subclasses ?? []).map(subclassFromRecord),
  }),
  submitFields: async (form, rec) => {
    let primary = [...form.primary_abilities]
    if (form.spellcasting_ability && !primary.includes(form.spellcasting_ability)) {
      primary = [...primary, form.spellcasting_ability]
    }
    const base = {
      name: form.name,
      hit_dice: form.hit_dice,
      skill_choice_count: toNumDefault(form.skill_choice_count, 2),
      spellcasting_ability: form.spellcasting_ability || null,
      is_homebrew: form.is_homebrew,
      description: form.description,
    }
    if (rec) {
      await api.classes.update(rec.id, { ...base, primary_abilities: primary, saving_throws: form.saving_throws })
      await api.classes.availableSkills(rec.id, { skill_ids: form.skill_ids })
      if (form.spellcasting_ability) await saveSpellSlots(form, rec, rec.spell_slot_progression)
    } else {
      return api.classes.create({
        ...base,
        primary_abilities: primary,
        saving_throws: form.saving_throws,
        available_skills: form.skill_ids,
        spell_slot_progression: buildSpellSlotPayload(form.spell_slots),
      })
    }
  },
  listBadges: (item) =>
    item.hit_dice ? [{ text: diceTypeLabels[item.hit_dice] ?? item.hit_dice, tone: 'default' }] : [],
}

const skillsCfg = {
  singular: 'навык',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Акробатика' },
    { key: 'key', label: 'Ключ (key)', type: 'text', required: true, placeholder: 'Например, acrobatics' },
    { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels) },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [],
  emptyForm: () => ({ name: '', key: '', ability: 'STR', description: '' }),
  fromRecord: (r) => ({
    name: r.name,
    key: r.key,
    ability: r.ability,
    description: r.description ?? '',
  }),
  submitFields: async (form, rec) => {
    const base = { name: form.name, key: form.key, ability: form.ability, description: form.description }
    if (rec) await api.skills.update(rec.id, base)
    else await api.skills.create(base)
  },
  listBadges: (item) =>
    item.ability ? [{ text: abilityLabels[item.ability] ?? item.ability, tone: 'default' }] : [],
}

const spellsCfg = {
  singular: 'заклинание',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Огненный шар' },
    { key: 'level', label: 'Уровень', type: 'select', options: opt(spellLevelLabels) },
    { key: 'school', label: 'Школа', type: 'select', options: opt(spellSchoolLabels) },
    { key: 'cast_time', label: 'Время накладывания', type: 'select', options: opt(spellCastTimeLabels) },
    { key: 'range_type', label: 'Дистанция', type: 'select', options: opt(spellRangeLabels) },
    { key: 'range_value', label: 'Дистанция (значение)', type: 'number', min: 0 },
    { key: 'duration', label: 'Длительность', type: 'select', options: opt(spellDurationLabels) },
    { key: 'is_concentration', label: 'Концентрация', type: 'checkbox' },
    { key: 'is_ritual', label: 'Ритуал', type: 'checkbox' },
    { key: 'is_material_consumed', label: 'Материал расходуется', type: 'checkbox' },
    { key: 'material', label: 'Материальные компоненты', type: 'text', placeholder: 'Например: капля драконьей крови' },
    { key: 'attack_type', label: 'Тип атаки', type: 'select', options: optOptional(attackTypeLabels) },
    { key: 'save_stat', label: 'Характеристика спасброска', type: 'select', options: optOptional(abilityLabels) },
    { key: 'damage_type', label: 'Тип урона', type: 'select', options: optOptional(damageTypeLabels) },
    { key: 'damage_dice_count', label: 'Количество костей урона', type: 'number', min: 0 },
    { key: 'damage_dice_type', label: 'Кость урона', type: 'select', options: optOptional(diceTypeLabels) },
    { key: 'healing_target', label: 'Лечение', type: 'select', options: optOptional(healingTargetLabels) },
    { key: 'healing_dice_count', label: 'Количество костей лечения', type: 'number', min: 0 },
    { key: 'healing_dice_type', label: 'Кость лечения', type: 'select', options: optOptional(diceTypeLabels) },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
    { key: 'higher_levels', label: 'На более высоких уровнях', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'pills', key: 'components', label: 'Компоненты', options: opt(componentLabels), empty: 'Не выбрано' },
    { type: 'pillsFrom', listKey: 'classes', key: 'class_ids', label: 'Доступно классам (пусто — без ограничений)', empty: 'Классов в справочнике нет' },
    { type: 'pillsFrom', listKey: 'races', key: 'race_ids', label: 'Доступно расам (пусто — без ограничений)', empty: 'Рас в справочнике нет' },
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
    race_ids: [],
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
    race_ids: (r.available_races ?? []).map((x) => x.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: form.level,
      school: form.school,
      cast_time: form.cast_time,
      range_type: form.range_type,
      range_value: toNum(form.range_value),
      duration: form.duration,
      is_concentration: form.is_concentration,
      is_ritual: form.is_ritual,
      is_material_consumed: form.is_material_consumed,
      material: form.material,
      attack_type: form.attack_type || null,
      save_stat: form.save_stat || null,
      damage_type: form.damage_type || null,
      damage_dice_count: toNum(form.damage_dice_count),
      damage_dice_type: form.damage_dice_type || null,
      healing_target: form.healing_target || null,
      healing_dice_count: toNum(form.healing_dice_count),
      healing_dice_type: form.healing_dice_type || null,
      description: form.description,
      higher_levels: form.higher_levels,
      components: form.components,
    }
    if (rec) {
      await api.spells.update(rec.id, base)
      await api.spells.classes(rec.id, { class_ids: form.class_ids })
      await api.spells.races(rec.id, { race_ids: form.race_ids })
    } else {
      await api.spells.create({
        ...base,
        available_classes: form.class_ids,
        available_races: form.race_ids,
      })
    }
  },
  listBadges: (item) =>
    [
      item.level ? { text: spellLevelLabels[item.level] ?? item.level, tone: 'accent' } : null,
      item.school ? { text: spellSchoolLabels[item.school] ?? item.school, tone: 'default' } : null,
    ].filter(Boolean),
}

const backgroundsCfg = {
  singular: 'предыстория',
  featuresSource: { type: 'BACKGROUND', fk: 'background_id' },
  featuresOps: api.backgrounds.features,
  featuresModal: { showLevel: false, levelHint: '' },
  featuresBlock: {
    label: 'Умения предыстории',
    addLabel: '+ Добавить умение',
    empty: 'Умений предыстории нет',
    noun: 'умение',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Благородный' },
    { key: 'personality_traits_suggestions', label: 'Черты личности', type: 'textarea', full: true },
    { key: 'ideals_suggestions', label: 'Идеалы', type: 'textarea', full: true },
    { key: 'bonds_suggestions', label: 'Привязанности', type: 'textarea', full: true },
    { key: 'flaws_suggestions', label: 'Слабости', type: 'textarea', full: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
  ],
  sections: [
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки предыстории', empty: 'Навыков в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    personality_traits_suggestions: '',
    ideals_suggestions: '',
    bonds_suggestions: '',
    flaws_suggestions: '',
    description: '',
    is_homebrew: false,
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    personality_traits_suggestions: r.personality_traits_suggestions ?? '',
    ideals_suggestions: r.ideals_suggestions ?? '',
    bonds_suggestions: r.bonds_suggestions ?? '',
    flaws_suggestions: r.flaws_suggestions ?? '',
    description: r.description ?? '',
    is_homebrew: !!r.is_homebrew,
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      personality_traits_suggestions: form.personality_traits_suggestions,
      ideals_suggestions: form.ideals_suggestions,
      bonds_suggestions: form.bonds_suggestions,
      flaws_suggestions: form.flaws_suggestions,
      description: form.description,
      is_homebrew: form.is_homebrew,
    }
    if (rec) {
      await api.backgrounds.update(rec.id, base)
      await api.backgrounds.skills(rec.id, { skill_ids: form.skill_ids })
    } else {
      return api.backgrounds.create({ ...base, granted_skills: form.skill_ids })
    }
  },
  listBadges: () => [],
}

const featsCfg = {
  singular: 'черта',
  featuresSource: { type: 'FEAT', fk: 'feat_id' },
  featuresOps: api.feats.features,
  featuresModal: { showLevel: false, levelHint: '' },
  featuresBlock: {
    label: 'Умения',
    addLabel: '+ Добавить умение',
    empty: 'Умений нет',
    noun: 'умение',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Проворный' },
    { key: 'prerequisite_ability', label: 'Требуемая характеристика', type: 'select', options: optOptional(abilityLabels) },
    { key: 'prerequisite_minimum_score', label: 'Минимальное значение', type: 'number', min: 1, max: 30 },
    { key: 'prerequisite_description', label: 'Описание требований', type: 'textarea', full: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_score_increases',
      label: 'Увеличение характеристик',
      addLabel: '+ Добавить',
      empty: 'Увеличений нет',
      defaults: { ability: 'STR', amount: 1 },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels) },
        { key: 'amount', label: 'Величина', type: 'number', min: 0, max: 5, width: 'w-24' },
      ],
    },
  ],
  emptyForm: () => ({
    name: '',
    prerequisite_ability: '',
    prerequisite_minimum_score: '',
    prerequisite_description: '',
    description: '',
    is_homebrew: false,
    ability_score_increases: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    prerequisite_ability: r.prerequisite_ability ?? '',
    prerequisite_minimum_score: toStr(r.prerequisite_minimum_score),
    prerequisite_description: r.prerequisite_description ?? '',
    description: r.description ?? '',
    is_homebrew: !!r.is_homebrew,
    ability_score_increases: (r.ability_score_increases ?? []).map((a) => ({
      ability: a.ability,
      amount: a.amount,
    })),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      prerequisite_ability: form.prerequisite_ability || null,
      prerequisite_minimum_score: toNum(form.prerequisite_minimum_score),
      prerequisite_description: form.prerequisite_description,
      description: form.description,
      is_homebrew: form.is_homebrew,
    }
    if (rec) {
      await api.feats.update(rec.id, base)
      await api.feats.abilityScoreIncreases(rec.id, { ability_score_increases: form.ability_score_increases })
    } else {
      return api.feats.create({ ...base, ability_score_increases: form.ability_score_increases })
    }
  },
  listBadges: (item) =>
    item.prerequisite_ability
      ? [{ text: `${abilityLabels[item.prerequisite_ability] ?? item.prerequisite_ability} ${toStr(item.prerequisite_minimum_score)}`, tone: 'default' }]
      : [],
}

const itemsCfg = {
  singular: 'предмет',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Длинный меч' },
    { key: 'item_type', label: 'Тип предмета', type: 'select', options: opt(itemTypeLabels) },
    { key: 'rarity', label: 'Редкость', type: 'select', options: opt(itemRarityLabels) },
    { key: 'requires_attunement', label: 'Требует настройки', type: 'checkbox' },
    { key: 'weight', label: 'Вес (фунты)', type: 'number', min: 0 },
    { key: 'cost_gold', label: 'Цена (золото)', type: 'number', min: 0 },
    { key: 'damage_dice_count', label: 'Количество костей урона', type: 'number', min: 0 },
    { key: 'damage_dice_type', label: 'Кость урона', type: 'select', options: optOptional(diceTypeLabels) },
    { key: 'damage_type', label: 'Тип урона', type: 'select', options: optOptional(damageTypeLabels) },
    { key: 'weapon_properties', label: 'Свойства оружия', type: 'text', placeholder: 'Например: FINESSE,LIGHT,THROWN' },
    { key: 'armor_class_base', label: 'КД (базовый)', type: 'number', min: 0 },
    { key: 'armor_class_dex_bonus', label: 'КД + Ловкость', type: 'checkbox' },
    { key: 'armor_class_max_dex_bonus', label: 'Макс. бонус Ловкости к КД', type: 'number', min: 0 },
    { key: 'strength_requirement', label: 'Требование силы', type: 'number', min: 0 },
    { key: 'stealth_disadvantage', label: 'Помеха к скрытности', type: 'checkbox' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
  ],
  sections: [],
  emptyForm: () => ({
    name: '',
    item_type: 'WEAPON',
    rarity: 'NONE',
    requires_attunement: false,
    weight: '',
    cost_gold: '',
    damage_dice_count: '',
    damage_dice_type: '',
    damage_type: '',
    weapon_properties: '',
    armor_class_base: '',
    armor_class_dex_bonus: true,
    armor_class_max_dex_bonus: '',
    strength_requirement: '',
    stealth_disadvantage: false,
    description: '',
    is_homebrew: false,
  }),
  fromRecord: (r) => ({
    name: r.name,
    item_type: r.item_type,
    rarity: r.rarity ?? 'NONE',
    requires_attunement: !!r.requires_attunement,
    weight: toStr(r.weight),
    cost_gold: toStr(r.cost_gold),
    damage_dice_count: toStr(r.damage_dice_count),
    damage_dice_type: r.damage_dice_type ?? '',
    damage_type: r.damage_type ?? '',
    weapon_properties: r.weapon_properties ?? '',
    armor_class_base: toStr(r.armor_class_base),
    armor_class_dex_bonus: r.armor_class_dex_bonus ?? true,
    armor_class_max_dex_bonus: toStr(r.armor_class_max_dex_bonus),
    strength_requirement: toStr(r.strength_requirement),
    stealth_disadvantage: !!r.stealth_disadvantage,
    description: r.description ?? '',
    is_homebrew: !!r.is_homebrew,
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      item_type: form.item_type,
      rarity: form.rarity,
      requires_attunement: form.requires_attunement,
      weight: toNum(form.weight),
      cost_gold: toNum(form.cost_gold),
      damage_dice_count: toNum(form.damage_dice_count),
      damage_dice_type: form.damage_dice_type || null,
      damage_type: form.damage_type || null,
      weapon_properties: form.weapon_properties,
      armor_class_base: toNum(form.armor_class_base),
      armor_class_dex_bonus: form.armor_class_dex_bonus,
      armor_class_max_dex_bonus: toNum(form.armor_class_max_dex_bonus),
      strength_requirement: toNum(form.strength_requirement),
      stealth_disadvantage: form.stealth_disadvantage,
      description: form.description,
      is_homebrew: form.is_homebrew,
    }
    if (rec) await api.items.update(rec.id, base)
    else await api.items.create(base)
  },
  listBadges: (item) =>
    [
      item.item_type ? { text: itemTypeLabels[item.item_type] ?? item.item_type, tone: 'default' } : null,
      item.rarity && item.rarity !== 'NONE' ? { text: itemRarityLabels[item.rarity] ?? item.rarity, tone: 'default' } : null,
    ].filter(Boolean),
}

const featuresCfg = {
  singular: 'особенность',
  listParams: { source_type: 'OTHER' },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Печать древней клятвы' },
    { key: 'level', label: 'Уровень', type: 'number', min: 1, max: 20 },
    { key: 'is_homebrew', label: 'Homebrew', type: 'checkbox' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [],
  emptyForm: () => ({ name: '', level: '', is_homebrew: false, description: '' }),
  fromRecord: (r) => ({
    name: r.name,
    level: toStr(r.level),
    is_homebrew: !!r.is_homebrew,
    description: r.description ?? '',
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: toNum(form.level),
      description: form.description,
      is_homebrew: form.is_homebrew,
    }
    if (rec) await api.features.update(rec.id, base)
    else await api.features.create(base)
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}

export const editorConfig = {
  races: { ...catalog.races, ...racesCfg },
  classes: { ...catalog.classes, ...classesCfg },
  skills: { ...catalog.skills, ...skillsCfg },
  spells: { ...catalog.spells, ...spellsCfg },
  backgrounds: { ...catalog.backgrounds, ...backgroundsCfg },
  feats: { ...catalog.feats, ...featsCfg },
  items: { ...catalog.items, ...itemsCfg },
  features: { ...catalog.features, ...featuresCfg },
}
