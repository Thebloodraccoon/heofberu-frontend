import { catalogApi as api } from '../../api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import { opt, optOptional, toNum, toStr } from './shared.js'

export const featsCfg = {
  singular: 'черта',
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Проворный' },
    { key: 'prerequisite_ability', label: 'Требуемая характеристика', type: 'select', options: optOptional(abilityLabels), inline: true },
    { key: 'prerequisite_minimum_score', label: 'Минимальное значение', type: 'number', min: 1, max: 30, inline: true },
    { key: 'prerequisite_description', label: 'Описание требований', type: 'textarea', full: true },
    { key: 'min_level', label: 'Минимальный уровень', type: 'number', min: 1, max: 20, inline: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_score_increases',
      label: 'Увеличение характеристик',
      addLabel: '+ Добавить',
      empty: 'Увеличений нет',
      fixedWidths: true,
      defaults: { ability: 'STR', amount: 1 },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels), width: 'w-48' },
        { key: 'amount', label: 'Величина', type: 'number', min: 0, max: 5, width: 'w-20' },
      ],
    },
  ],
  emptyForm: () => ({
    name: '',
    prerequisite_ability: '',
    prerequisite_minimum_score: '',
    prerequisite_description: '',
    min_level: '',
    description: '',
    ability_score_increases: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    prerequisite_ability: r.prerequisite_ability ?? '',
    prerequisite_minimum_score: toStr(r.prerequisite_minimum_score),
    prerequisite_description: r.prerequisite_description ?? '',
    min_level: toStr(r.min_level),
    description: r.description ?? '',
    ability_score_increases: (r.ability_score_increases ?? []).map((a) => ({
      ability: a.ability,
      amount: a.amount,
    })),
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
    if (rec) {
      await api.feats.update(rec.id, base)
      await api.feats.abilityScoreIncreases(rec.id, { ability_score_increases: form.ability_score_increases })
    } else {
      return api.feats.create({ ...base, ability_score_increases: form.ability_score_increases })
    }
  },
  listBadges: (item) => [
    ...(item.min_level != null ? [{ text: `с ${item.min_level}-го уровня`, tone: 'accent' }] : []),
    ...(item.prerequisite_ability
      ? [{ text: `${abilityLabels[item.prerequisite_ability] ?? item.prerequisite_ability} ${toStr(item.prerequisite_minimum_score)}`, tone: 'default' }]
      : []),
  ],
}
