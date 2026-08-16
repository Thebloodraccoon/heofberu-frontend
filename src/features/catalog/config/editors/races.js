import { catalogApi as api } from '../../api.js'
import { abilityLabels, raceSizeLabels } from '@/lib/i18n/index.js'
import { opt, toNumDefault, toStr } from './shared.js'

export const racesCfg = {
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
  hasSubraces: true,
  subracesBlock: {
    label: 'Подрасы',
    addLabel: '+ Добавить подрасу',
    empty: 'Подрас нет',
    noun: 'подрасу',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Эльф' },
    { key: 'size', label: 'Размер', type: 'select', options: opt(raceSizeLabels) },
    { key: 'speed', label: 'Скорость (фт.)', type: 'number', min: 0 },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_bonuses',
      label: 'Бонусы характеристик',
      addLabel: '+ Добавить',
      empty: 'Бонусов нет',
      labels: true,
      fixedWidths: true,
      defaults: { ability: 'STR', bonus: 1 },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels), width: 'w-48' },
        { key: 'bonus', label: 'Бонус', type: 'number', min: -5, max: 5, width: 'w-20' },
      ],
    },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки расы', empty: 'Навыков в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    size: 'MEDIUM',
    speed: '30',
    description: '',
    ability_bonuses: [],
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    size: r.size,
    speed: toStr(r.speed ?? 30),
    description: r.description ?? '',
    ability_bonuses: (r.ability_bonuses ?? []).map((b) => ({ ability: b.ability, bonus: b.bonus })),
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      size: form.size,
      speed: toNumDefault(form.speed, 30),
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
