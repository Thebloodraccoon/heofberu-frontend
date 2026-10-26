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
  imageOps: api.classes.image,
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Волшебник', full: true },
    { key: 'hit_dice', label: 'Кость хитов', type: 'dice', typeKey: 'hit_dice' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'pills', key: 'saving_throws', label: 'Спасброски', options: opt(abilityLabels), empty: 'Не выбрано' },
    { type: 'pills', key: 'armor_proficiencies', label: 'Владение доспехами', options: opt(armorProficiencyLabels), empty: 'Не выбрано' },
    { type: 'pills', key: 'weapon_proficiencies', label: 'Владение оружием', options: opt(weaponProficiencyLabels), empty: 'Не выбрано' },
    // countKey — сколько из них выбирает игрок: счётчик прямо в шапке блока.
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', countKey: 'skill_choice_count', label: 'Доступные навыки', empty: 'Навыков в справочнике нет' },
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
  // POST/PATCH /classes несут только базовые поля (PATCH — ещё и спасброски);
  // владения доспехами/оружием и навыки — свои PUT (full replace), при создании —
  // сразу после POST.
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      hit_dice: form.hit_dice,
      skill_choice_count: toNumDefault(form.skill_choice_count, 2),
      spellcasting_ability: form.spellcasting_ability || null,
      description: form.description,
    }
    const norm = (arr) => JSON.stringify([...(arr ?? [])].map(String).sort())
    const lists = [
      ['saving_throws', (rec?.saving_throws ?? []).map((x) => x.ability), api.classes.savingThrows],
      ['armor_proficiencies', (rec?.armor_proficiencies ?? []).map((x) => x.armor_type), api.classes.armorProficiencies],
      ['weapon_proficiencies', (rec?.weapon_proficiencies ?? []).map((x) => x.weapon_category), api.classes.weaponProficiencies],
    ]
    const saveLists = async (id) => {
      for (const [key, prev, put] of lists) {
        if (norm(form[key]) !== norm(prev)) await put(id, { [key]: form[key] ?? [] })
      }
      const prevSkillIds = (rec?.available_skills ?? []).map((s) => s.id)
      if (norm(form.skill_ids) !== norm(prevSkillIds)) await api.classes.availableSkills(id, { skill_ids: form.skill_ids })
    }
    if (rec) {
      const baseChanged =
        base.name !== rec.name ||
        base.hit_dice !== rec.hit_dice ||
        base.skill_choice_count !== Number(rec.skill_choice_count ?? 2) ||
        base.spellcasting_ability !== (rec.spellcasting_ability || null) ||
        base.description !== (rec.description ?? '')
      if (baseChanged) await api.classes.update(rec.id, base)
      await saveLists(rec.id)
      const slotsForm = form.spellcasting_ability ? form : { ...form, spell_slots: {} }
      await saveSpellSlots(slotsForm, rec, rec.spell_slot_progression)
      return rec
    }
    const created = await api.classes.create(base)
    await saveLists(created.id)
    if (form.spellcasting_ability) {
      await saveSpellSlots(form, created, created.spell_slot_progression)
    }
    return created
  },
  listBadges: (item) =>
    item.hit_dice ? [{ text: diceTypeLabels[item.hit_dice] ?? item.hit_dice, tone: 'default' }] : [],
}
