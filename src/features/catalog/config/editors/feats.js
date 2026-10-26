import { catalogApi as api } from '../../api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import {
  effectSummaryLines,
  normalizeEffectsTree,
  syncFeatureEffects,
} from '@/lib/utils/featureEffects.js'
import { optOptional, toNum, toStr } from './shared.js'
import { creationScaling } from './features.js'

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
    // Характеристика и порог — одной строкой: «[Сил][Лов]…  не ниже [−] 13 [+]».
    { key: 'prerequisite_ability', label: 'Требуемая характеристика', type: 'abilityScore', scoreKey: 'prerequisite_minimum_score', options: optOptional(abilityLabels) },
    { key: 'prerequisite_description', label: 'Описание требований', type: 'textarea', full: true },
    { key: 'min_level', label: 'Минимальный уровень', type: 'level', emptyText: 'Любой' },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    { type: 'scaling', key: 'scaling', levelKey: 'min_level' },
    // Две вкладки (tabs.js): «Статичные эффекты» и «Выбор эффектов», у каждой —
    // превью своей части effects_summary (сводка целиком больше не показывается).
    { type: 'effectsTree', key: 'effects', part: 'static' },
    { type: 'effectsTree', key: 'effects', part: 'choice' },
  ],
  emptyForm: () => ({
    name: '',
    prerequisite_ability: '',
    prerequisite_minimum_score: '',
    prerequisite_description: '',
    min_level: '',
    description: '',
    effects_summary: '',
    scaling: null,
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
    if (!rec) {
      const scaling = creationScaling(form, 'min_level')
      const created = await api.feats.create(base)
      if (scaling) await api.features.update(created.id, { scaling })
      await syncFeatureEffects(api.feats, created.id, normalizeEffectsTree(), effects)
      return created
    }
    // Диффим по секциям: PATCH базы летит только при изменении полей, а дерево
    // эффектов уезжает точечными запросами по изменившимся строкам.
    const prevForm = featsCfg.fromRecord(rec)
    const prevBase = {
      name: prevForm.name,
      prerequisite_ability: prevForm.prerequisite_ability || null,
      prerequisite_minimum_score: toNum(prevForm.prerequisite_minimum_score),
      prerequisite_description: prevForm.prerequisite_description,
      min_level: toNum(prevForm.min_level),
      description: prevForm.description,
    }
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    if (!eq(base, prevBase)) {
      await api.feats.update(rec.id, base)
    }
    await syncFeatureEffects(api.feats, rec.id, prevForm.effects, effects)
    return rec
  },
  listBadges: (item) => [
    ...(item.min_level != null ? [{ text: `с ${item.min_level}-го уровня`, tone: 'accent' }] : []),
    ...(item.prerequisite_ability
      ? [{ text: `${abilityLabels[item.prerequisite_ability] ?? item.prerequisite_ability} ${toStr(item.prerequisite_minimum_score)}`, tone: 'default' }]
      : []),
  ],
}