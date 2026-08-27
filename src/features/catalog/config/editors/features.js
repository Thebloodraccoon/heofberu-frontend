import { catalogApi as api } from '../../api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import { opt, toNum, toStr } from './shared.js'

const toNumDefaultZero = (v) => (v === '' || v == null ? 0 : Number(v))

export const featuresCfg = {
  singular: 'особенность',
  listParams: { source_type: 'OTHER' },
  // Увеличения характеристик живут на отдельном эндпоинте — подтягиваем
  // их при открытии записи, чтобы форма работала как обычная секция.
  enrich: async (record) => {
    const res = await api.features.abilityIncreases.get(record.id).catch(() => null)
    return { ...record, ability_increases: res?.ability_increases ?? [] }
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Печать древней клятвы' },
    { key: 'level', label: 'Уровень', type: 'number', min: 1, max: 20 },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_increases',
      label: 'Увеличения характеристик',
      addLabel: '+ Добавить',
      empty: 'Увеличений нет',
      fixedWidths: true,
      defaults: { ability: 'STR', amount: 1, new_cap: '' },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels), width: 'w-48' },
        { key: 'amount', label: 'Величина', type: 'number', width: 'w-20' },
        { key: 'new_cap', label: 'Новый предел', type: 'number', min: 0, max: 30, width: 'w-24' },
      ],
    },
  ],
  emptyForm: () => ({ name: '', level: '', description: '', ability_increases: [] }),
  fromRecord: (r) => ({
    name: r.name,
    level: toStr(r.level),
    description: r.description ?? '',
    ability_increases: (r.ability_increases ?? []).map((a) => ({
      ability: a.ability,
      amount: a.amount,
      new_cap: a.new_cap ?? '',
    })),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      level: toNum(form.level),
      description: form.description,
    }
    const increases = (form.ability_increases ?? []).map((a) => ({
      ability: a.ability,
      amount: toNumDefaultZero(a.amount),
      new_cap: toNum(a.new_cap),
    }))
    if (rec) {
      await api.features.update(rec.id, base)
      await api.features.abilityIncreases.set(rec.id, { ability_increases: increases })
      return rec
    }
    const created = await api.features.create(base)
    if (increases.length > 0) {
      await api.features.abilityIncreases.set(created.id, { ability_increases: increases })
    }
    return created
  },
  listBadges: (item) => [
    item.level != null ? { text: `${item.level}-й уровень`, tone: 'accent' } : null,
  ].filter(Boolean),
}
