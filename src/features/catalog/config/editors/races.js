import { catalogApi as api } from '../../api.js'
import { abilityLabels, raceSizeLabels } from '@/lib/i18n/index.js'
import { opt, toNumDefault, toStr } from './shared.js'

export const racesCfg = {
  singular: 'раса',
  featuresSource: { type: 'RACE', fk: 'race_id' },
  featuresOps: api.races.features,
  featuresModal: { showLevel: false, levelHint: '' },
  featuresBlock: {
    label: 'Особенности и умения расы',
    addLabel: '+ Добавить',
    empty: 'Особенностей и умений нет',
    noun: 'особенность',
  },
  hasSubraces: true,
  imageOps: api.races.image,
  subracesBlock: {
    label: 'Подрасы',
    addLabel: '+ Добавить',
    empty: 'Подрас нет',
    noun: 'подрасу',
  },
  fields: [
    { key: 'name', label: 'Название', type: 'text', required: true, placeholder: 'Например, Эльф', full: true },
    { key: 'size', label: 'Размер', type: 'select', options: opt(raceSizeLabels), inline: true },
    { key: 'speed', label: 'Скорость (фт.)', type: 'number', min: 0, inline: true },
    { key: 'description', label: 'Описание', type: 'textarea', full: true },
  ],
  sections: [
    {
      type: 'rows',
      key: 'ability_bonuses',
      label: 'Бонусы характеристик',
      addLabel: '+ Добавить',
      empty: 'Бонусов нет',
      labels: true,
      fixedWidths: true,
      defaults: { ability: 'STR', bonus: 1 },
      columns: [
        { key: 'ability', label: 'Характеристика', type: 'select', options: opt(abilityLabels), width: 'w-48' },
        { key: 'bonus', label: 'Бонус', type: 'number', min: -5, max: 5, width: 'w-20' },
      ],
    },
    { type: 'pillsFrom', listKey: 'skills', key: 'skill_ids', label: 'Навыки расы', empty: 'Навыков в справочнике нет' },
    { type: 'tags', key: 'tags', label: 'Теги' },
  ],
  emptyForm: () => ({
    name: '',
    size: 'MEDIUM',
    speed: '30',
    description: '',
    ability_bonuses: [],
    skill_ids: [],
    tags: [],
  }),
  fromRecord: (r) => ({
    name: r.name,
    size: r.size,
    speed: toStr(r.speed ?? 30),
    description: r.description ?? '',
    ability_bonuses: (r.ability_bonuses ?? []).map((b) => ({ ability: b.ability, bonus: b.bonus })),
    skill_ids: (r.granted_skills ?? []).map((s) => s.id),
    tags: (r.tags ?? []).map((t) => ({ id: t.id, name: t.name })),
  }),
  submitFields: async (form, rec) => {
    const base = {
      name: form.name,
      size: form.size,
      speed: toNumDefault(form.speed, 30),
      description: form.description,
    }
    if (!rec) {
      const created = await api.races.create({
        ...base,
        ability_bonuses: form.ability_bonuses,
        granted_skills: form.skill_ids,
      })
      if (form.tags.length) {
        await api.races.tags(created.id, { tag_ids: form.tags.map((t) => t.id) })
      }
      return created
    }
    // Диффим по секциям, чтобы автосейв не слал лишних запросов, когда меняется
    // только один блок (напр., только навыки, а база и бонусы не трогались).
    const baseChanged =
      base.name !== rec.name ||
      base.size !== rec.size ||
      base.speed !== Number(rec.speed) ||
      base.description !== (rec.description ?? '')
    if (baseChanged) await api.races.update(rec.id, base)
    const normBonuses = (rows = []) =>
      rows.map((b) => ({ ability: b.ability, bonus: Number(b.bonus) })).sort((a, b) => a.ability.localeCompare(b.ability))
    if (JSON.stringify(normBonuses(form.ability_bonuses)) !== JSON.stringify(normBonuses(rec.ability_bonuses))) {
      await api.races.abilityBonuses(rec.id, { ability_bonuses: form.ability_bonuses })
    }
    const prevSkillIds = (rec.granted_skills ?? []).map((s) => Number(s.id)).sort()
    const nextSkillIds = form.skill_ids.map(Number).sort()
    if (JSON.stringify(prevSkillIds) !== JSON.stringify(nextSkillIds)) {
      await api.races.skills(rec.id, { skill_ids: form.skill_ids })
    }
    const prevTagIds = (rec.tags ?? []).map((t) => Number(t.id)).sort()
    const nextTagIds = form.tags.map((t) => Number(t.id)).sort()
    if (JSON.stringify(prevTagIds) !== JSON.stringify(nextTagIds)) {
      await api.races.tags(rec.id, { tag_ids: form.tags.map((t) => t.id) })
    }
  },
  listBadges: (item) =>
    [
      item.size ? { text: raceSizeLabels[item.size] ?? item.size, tone: 'default' } : null,
      item.speed != null ? { text: `${item.speed} фт.`, tone: 'default' } : null,
    ].filter(Boolean),
}
