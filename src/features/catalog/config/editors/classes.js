import { catalogApi as api } from '../../api.js'
import { abilityLabels, armorProficiencyLabels, diceTypeLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { opt, optOptional, saveSpellSlots, subclassFromRecord, toNumDefault, toStr } from './shared.js'

export const classesCfg = {
  singular: 'класс',
  featuresSource: { type: 'CLASS', fk: 'class_id' },
  featuresOps: api.classes.features,
  featuresModal: {
    showLevel: true,
    levelRequired: true,
    levelHint: 'Укажите уровень, с которого умение доступно.',
  },
  featuresBlock: {
    label: 'Умения класса',
    addLabel: '+ Добавить',
    empty: 'Умений нет',
    noun: 'умение',
  },
  itemsOps: api.classes.items,
  itemsBlock: {
    label: 'Стартовое снаряжение',
    addLabel: '+ Добавить',
    empty: 'Снаряжения нет',
    noun: 'предмет',
  },
  choiceGroupsOps: api.classes.choiceGroups,
  hasSubclasses: true,
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Волшебник' },
    { key: 'hit_dice', label: 'Кость хитов', type: 'select', options: opt(diceTypeLabels) },
    { key: 'skill_choice_count', label: 'Количество навыков', type: 'number', min: 0 },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'pills', key: 'saving_throws', label: 'Спасброски', options: opt(abilityLabels), empty: 'Не выбрано' },
    { type: 'pills', key: 'armor_proficiencies', label: 'Владение доспехами', options: opt(armorProficiencyLabels), empty: 'Не выбрано' },
    { type: 'pills', key: 'weapon_proficiencies', label: 'Владение оружием', options: opt(weaponProficiencyLabels), empty: 'Не выбрано' },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Доступные навыки', empty: 'Навыков в справочнике нет' },
    {
      type: 'spellcasting',
      key: 'spellcasting_ability',
      slotsKey: 'spell_slots',
      label: 'Характеристика заклинаний',
      options: optOptional(abilityLabels),
      hint: 'Если очистить характеристику, при сохранении будут удалены все ячейки заклинаний класса.',
      chooseHint: 'Выберите характеристику, чтобы задать ячейки заклинаний по уровням.',
    },
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
    description: '',
    saving_throws: [],
    armor_proficiencies: [],
    weapon_proficiencies: [],
    skill_ids: [],
    spell_slots: {},
  }),
  fromRecord: (r) => ({
    name: r.name,
    hit_dice: r.hit_dice,
    skill_choice_count: toStr(r.skill_choice_count ?? 2),
    spellcasting_ability: r.spellcasting_ability ?? '',
    description: r.description ?? '',
    saving_throws: (r.saving_throws ?? []).map((s) => s.ability),
    armor_proficiencies: (r.armor_proficiencies ?? []).map((a) => a.armor_type),
    weapon_proficiencies: (r.weapon_proficiencies ?? []).map((w) => w.weapon_category),
    skill_ids: (r.available_skills ?? []).map((s) => s.id),
    spell_slots: (r.spell_slot_progression ?? []).reduce((acc, row) => {
      acc[row.class_level] = acc[row.class_level] || {}
      acc[row.class_level][row.spell_level] = row.slots
      return acc
    }, {}),
    subclasses: (r.subclasses ?? []).map(subclassFromRecord),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      hit_dice: form.hit_dice,
      skill_choice_count: toNumDefault(form.skill_choice_count, 2),
      spellcasting_ability: form.spellcasting_ability || null,
      description: form.description,
      saving_throws: form.saving_throws,
      armor_proficiencies: form.armor_proficiencies,
      weapon_proficiencies: form.weapon_proficiencies,
    }
    if (rec) {
      await api.classes.update(rec.id, base)
      await api.classes.availableSkills(rec.id, { skill_ids: form.skill_ids })
      const slotsForm = form.spellcasting_ability ? form : { ...form, spell_slots: {} }
      await saveSpellSlots(slotsForm, rec, rec.spell_slot_progression)
      return rec
    }
    // Бэкенд принимает при создании только базовые поля и списки
    // владений/навыков; ячейки заклинаний задаются отдельными PUT-ами.
    const created = await api.classes.create({ ...base, available_skills: form.skill_ids })
    if (form.spellcasting_ability) {
      await saveSpellSlots(form, created, created.spell_slot_progression)
    }
    return created
  },
  listBadges: (item) =>
    item.hit_dice ? [{ text: diceTypeLabels[item.hit_dice] ?? item.hit_dice, tone: 'default' }] : [],
}
