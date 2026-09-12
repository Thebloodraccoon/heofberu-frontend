import { catalogApi as api } from '../../api.js'
import { toNum, toStr } from './shared.js'

const suggestionGroups = [
  { value: 'PERSONALITY_TRAIT', label: 'Черты личности' },
  { value: 'IDEAL', label: 'Идеалы' },
  { value: 'BOND', label: 'Привязанности' },
  { value: 'FLAW', label: 'Слабости' },
]

export const backgroundsCfg = {
  singular: 'предыстория',
  featuresSource: { type: 'BACKGROUND', fk: 'background_id' },
  featuresOps: api.backgrounds.features,
  featuresModal: { showLevel: false, levelHint: '' },
  featuresBlock: {
    label: 'Умения предыстории',
    addLabel: '+ Добавить',
    empty: 'Умений предыстории нет',
    noun: 'умение',
  },
  itemsOps: api.backgrounds.items,
  itemsBlock: {
    label: 'Стартовое снаряжение',
    addLabel: '+ Добавить',
    empty: 'Снаряжения нет',
    noun: 'предмет',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Благородный', full: true },
    { key: 'starting_gold', label: 'Стартовое золото', type: 'number', min: 0, inline: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'groupedRows',
      key: 'suggestions',
      addLabel: '+ Добавить',
      empty: 'Вариантов нет',
      groupKey: 'suggestion_type',
      textKey: 'text',
      groups: suggestionGroups,
    },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки предыстории', empty: 'Навыков в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    starting_gold: '',
    description: '',
    suggestions: [],
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    starting_gold: toStr(r.starting_gold),
    description: r.description ?? '',
    suggestions: (r.suggestions ?? []).map((s) => ({
      suggestion_type: s.suggestion_type,
      text: s.text,
    })),
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      starting_gold: toNum(form.starting_gold),
      description: form.description,
    }
    const suggestions = form.suggestions.map((s) => ({ ...s, text: s.text?.trim() ? s.text : '-' }))
    if (rec) {
      await api.backgrounds.update(rec.id, base)
      await api.backgrounds.skills(rec.id, { skill_ids: form.skill_ids })
      await api.backgrounds.suggestions.set(rec.id, { suggestions })
    } else {
      const created = await api.backgrounds.create(base)
      await api.backgrounds.skills(created.id, { skill_ids: form.skill_ids })
      await api.backgrounds.suggestions.set(created.id, { suggestions })
      return created
    }
  },
  listBadges: () => [],
}
