import { catalogApi as api } from '../../api.js'
import { normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { buildChoiceGroupsPayload, buildFixedEffectsPayload } from '@/lib/utils/featureEffects.js'
import { toNum, toStr } from './shared.js'

export const featuresCfg = {
  singular: 'особенность',
  listParams: { source_type: 'OTHER' },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Печать древней клятвы', full: true },
    { key: 'level', label: 'Уровень', type: 'number', min: 1, max: 20 },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'effectsTree',
      key: 'effects',
      label: 'Эффекты и группы выбора',
    },
  ],
  emptyForm: () => ({ name: '', level: '', description: '', effects: normalizeEffectsTree() }),
  fromRecord: (r) => ({
    name: r.name,
    level: toStr(r.level),
    description: r.description ?? '',
    effects: normalizeEffectsTree(r),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: toNum(form.level),
      description: form.description,
    }
    const effects = form.effects ?? { ability_effects: [] }
    if (rec) {
      await api.features.update(rec.id, base)
      await api.features.effects.set(rec.id, buildFixedEffectsPayload(effects))
      await api.features.choiceGroups.set(rec.id, buildChoiceGroupsPayload(effects))
      return rec
    }
    const created = await api.features.create(base)
    await api.features.effects.set(created.id, buildFixedEffectsPayload(effects))
    await api.features.choiceGroups.set(created.id, buildChoiceGroupsPayload(effects))
    return created
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}