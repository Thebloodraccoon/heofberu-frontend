import { catalogApi as api } from '../../api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import { opt } from './shared.js'

export const skillsCfg = {
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
