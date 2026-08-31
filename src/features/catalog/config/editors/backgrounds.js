import { catalogApi as api } from '../../api.js'

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
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Благородный' },
    { key: 'personality_traits_suggestions', label: 'Черты личности', type: 'textarea', full: true },
    { key: 'ideals_suggestions', label: 'Идеалы', type: 'textarea', full: true },
    { key: 'bonds_suggestions', label: 'Привязанности', type: 'textarea', full: true },
    { key: 'flaws_suggestions', label: 'Слабости', type: 'textarea', full: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
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
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    personality_traits_suggestions: r.personality_traits_suggestions ?? '',
    ideals_suggestions: r.ideals_suggestions ?? '',
    bonds_suggestions: r.bonds_suggestions ?? '',
    flaws_suggestions: r.flaws_suggestions ?? '',
    description: r.description ?? '',
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
