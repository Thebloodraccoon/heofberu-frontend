import { catalogApi as api } from '../../api.js'
import { toNum, toStr } from './shared.js'

export const featuresCfg = {
  singular: 'особенность',
  listParams: { source_type: 'OTHER' },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Печать древней клятвы' },
    { key: 'level', label: 'Уровень', type: 'number', min: 1, max: 20 },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [],
  emptyForm: () => ({ name: '', level: '', description: '' }),
  fromRecord: (r) => ({
    name: r.name,
    level: toStr(r.level),
    description: r.description ?? '',
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: toNum(form.level),
      description: form.description,
    }
    if (rec) await api.features.update(rec.id, base)
    else await api.features.create(base)
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}
