import { catalogApi as api } from '../../api.js'
import { normalizeEffectsTree, syncFeatureEffects } from '@/lib/utils/featureEffects.js'
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
      // source_type обязателен у FeatureCreate: самостоятельная особенность
      // справочника ничьей частью не является — OTHER (тем же фильтром она
      // потом и ищется, см. listParams).
      const created = await api.features.create({ ...base, source_type: 'OTHER' })
      await syncFeatureEffects(api.features, created.id, normalizeEffectsTree(), effects)
      return created
    }
    // Диффим по секциям: PATCH базы летит только при изменении полей, а дерево
    // эффектов уезжает точечными запросами по изменившимся строкам.
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
    await syncFeatureEffects(api.features, rec.id, prevForm.effects, effects)
    return rec
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}