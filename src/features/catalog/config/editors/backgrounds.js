import { catalogApi as api } from '../../api.js'
import { toNum, toStr } from './shared.js'

const suggestionGroups = [
  { value: 'PERSONALITY_TRAIT', label: 'Черты личности' },
  { value: 'IDEAL', label: 'Идеалы' },
  { value: 'BOND', label: 'Привязанности' },
  { value: 'FLAW', label: 'Слабости' },
]

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
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Благородный', full: true },
    { key: 'starting_gold', label: 'Стартовое золото', type: 'number', min: 0, inline: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'groupedRows',
      key: 'suggestions',
      addLabel: '+ Добавить',
      empty: 'Вариантов нет',
      groupKey: 'suggestion_type',
      textKey: 'text',
      groups: suggestionGroups,
      // Позволяет сохранять одну правку сразу по галочке "Готово",
      // не дожидаясь общего автосейва формы.
      ops: api.backgrounds.suggestions,
    },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки предыстории', empty: 'Навыков в справочнике нет' },
  ],
  emptyForm: () => ({
    name: '',
    starting_gold: '',
    description: '',
    suggestions: [],
    skill_ids: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    starting_gold: toStr(r.starting_gold),
    description: r.description ?? '',
    suggestions: (r.suggestions ?? []).map((s) => ({
      id: s.id,
      suggestion_type: s.suggestion_type,
      text: s.text,
    })),
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      starting_gold: toNum(form.starting_gold),
      description: form.description,
    }
    const suggestions = form.suggestions.map((s) => ({ ...s, text: s.text?.trim() ? s.text : '-' }))
    if (!rec) {
      const created = await api.backgrounds.create(base)
      await api.backgrounds.skills(created.id, { skill_ids: form.skill_ids })
      for (const s of suggestions) {
        await api.backgrounds.suggestions.create(created.id, {
          suggestion_type: s.suggestion_type,
          text: s.text,
        })
      }
      return created
    }
    // Бэк теперь принимает саджесты поштучно (POST/PATCH/DELETE), а PUT-full-replace
    // снят. Диффим каждую секцию, чтобы автосейв не слал лишних запросов, когда
    // меняется только один блок (напр., только навыки).
    const prevGold = rec.starting_gold == null ? null : Number(rec.starting_gold)
    const baseChanged =
      base.name !== rec.name ||
      base.starting_gold !== prevGold ||
      base.description !== (rec.description ?? '')
    if (baseChanged) await api.backgrounds.update(rec.id, base)
    const prevSkillIds = (rec.granted_skills ?? []).map((s) => Number(s.id)).sort()
    const nextSkillIds = form.skill_ids.map(Number).sort()
    if (JSON.stringify(prevSkillIds) !== JSON.stringify(nextSkillIds)) {
      await api.backgrounds.skills(rec.id, { skill_ids: form.skill_ids })
    }
    const prevSugs = rec.suggestions ?? []
    const prevById = new Map(prevSugs.map((s) => [String(s.id), s]))
    const keepIds = new Set()
    for (const s of suggestions) {
      const prev = s.id != null ? prevById.get(String(s.id)) : null
      if (prev) {
        keepIds.add(String(s.id))
        if (prev.suggestion_type !== s.suggestion_type || (prev.text ?? '') !== s.text) {
          await api.backgrounds.suggestions.update(rec.id, s.id, {
            suggestion_type: s.suggestion_type,
            text: s.text,
          })
        }
      } else {
        await api.backgrounds.suggestions.create(rec.id, {
          suggestion_type: s.suggestion_type,
          text: s.text,
        })
      }
    }
    for (const prev of prevSugs) {
      if (!keepIds.has(String(prev.id))) {
        await api.backgrounds.suggestions.remove(rec.id, prev.id)
      }
    }
  },
  listBadges: () => [],
}
