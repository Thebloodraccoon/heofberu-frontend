import { catalogApi as api } from '../../api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import {
  buildChoiceGroupsPayload,
  buildFixedEffectsPayload,
  effectSummaryLines,
  normalizeEffectsTree,
} from '@/lib/utils/featureEffects.js'
import { optOptional, toNum, toStr } from './shared.js'

// FeatResponse (в отличие от FeatureResponse) не присылает готовую effects_summary
// с бэка — собираем её на клиенте из дерева эффектов тем же форматом
// (ul/li), что и бэкендовская сводка особенностей.
function effectsSummaryHtml(feature) {
  const lines = effectSummaryLines(feature)
  if (lines.length === 0) return ''
  return `<ul>${lines.map((l) => `<li><strong>${l.label}:</strong> ${l.text}</li>`).join('')}</ul>`
}

export const featsCfg = {
  singular: 'черта',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Проворный', full: true },
    { key: 'prerequisite_ability', label: 'Требуемая характеристика', type: 'select', options: optOptional(abilityLabels), inline: true },
    { key: 'prerequisite_minimum_score', label: 'Минимальное значение', type: 'number', min: 1, max: 30, inline: true },
    { key: 'prerequisite_description', label: 'Описание требований', type: 'textarea', full: true },
    { key: 'min_level', label: 'Минимальный уровень', type: 'number', min: 1, max: 20, inline: true },
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
  emptyForm: () => ({
    name: '',
    prerequisite_ability: '',
    prerequisite_minimum_score: '',
    prerequisite_description: '',
    min_level: '',
    description: '',
    effects_summary: '',
    effects: normalizeEffectsTree(),
  }),
  fromRecord: (r) => ({
    name: r.name,
    prerequisite_ability: r.prerequisite_ability ?? '',
    prerequisite_minimum_score: toStr(r.prerequisite_minimum_score),
    prerequisite_description: r.prerequisite_description ?? '',
    min_level: toStr(r.min_level),
    description: r.description ?? '',
    effects_summary: r.effects_summary ?? effectsSummaryHtml(r),
    effects: normalizeEffectsTree(r),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      prerequisite_ability: form.prerequisite_ability || null,
      prerequisite_minimum_score: toNum(form.prerequisite_minimum_score),
      prerequisite_description: form.prerequisite_description,
      min_level: toNum(form.min_level),
      description: form.description,
    }
    const effects = form.effects ?? { ability_effects: [] }
    if (rec) {
      await api.feats.update(rec.id, base)
      await api.feats.effects.set(rec.id, buildFixedEffectsPayload(effects))
      await api.feats.choiceGroups.set(rec.id, buildChoiceGroupsPayload(effects))
      return rec
    }
    const created = await api.feats.create(base)
    await api.feats.effects.set(created.id, buildFixedEffectsPayload(effects))
    await api.feats.choiceGroups.set(created.id, buildChoiceGroupsPayload(effects))
    return created
  },
  listBadges: (item) => [
    ...(item.min_level != null ? [{ text: `с ${item.min_level}-го уровня`, tone: 'accent' }] : []),
    ...(item.prerequisite_ability
      ? [{ text: `${abilityLabels[item.prerequisite_ability] ?? item.prerequisite_ability} ${toStr(item.prerequisite_minimum_score)}`, tone: 'default' }]
      : []),
  ],
}