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
    {
      key: 'effects_summary',
      label: 'Сводка эффектов',
      type: 'summary',
      full: true,
      showWhen: (f) => !!f.effects_summary,
    },
  ],
  sections: [
    {
      type: 'effectsTree',
      key: 'effects',
      label: 'Эффекты и группы выбора',
    },
  ],
  emptyForm: () => ({ name: '', level: '', description: '', effects_summary: '', effects: normalizeEffectsTree() }),
  fromRecord: (r) => ({
    name: r.name,
    level: toStr(r.level),
    description: r.description ?? '',
    effects_summary: r.effects_summary ?? '',
    effects: normalizeEffectsTree(r),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: toNum(form.level),
      description: form.description,
    }
    const effects = form.effects ?? { ability_effects: [] }
    if (!rec) {
      const created = await api.features.create(base)
      await api.features.effects.set(created.id, buildFixedEffectsPayload(effects))
      await api.features.choiceGroups.set(created.id, buildChoiceGroupsPayload(effects))
      return created
    }
    // Диффим по секциям: PATCH базы летит только при изменении полей, а тяжёлые
    // PUT эффектов/групп — только когда реально изменилось само дерево.
    const prevForm = featuresCfg.fromRecord(rec)
    const prevBase = {
      name: prevForm.name,
      level: toNum(prevForm.level),
      description: prevForm.description,
    }
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    if (!eq(base, prevBase)) {
      await api.features.update(rec.id, base)
    }
    if (!eq(buildFixedEffectsPayload(effects), buildFixedEffectsPayload(prevForm.effects))) {
      await api.features.effects.set(rec.id, buildFixedEffectsPayload(effects))
    }
    if (!eq(buildChoiceGroupsPayload(effects), buildChoiceGroupsPayload(prevForm.effects))) {
      await api.features.choiceGroups.set(rec.id, buildChoiceGroupsPayload(effects))
    }
    return rec
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}