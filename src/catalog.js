import { api } from './api/endpoints.js'

export const catalog = {
  races: { label: 'Расы', icon: 'Р', desc: 'Народы и их способности', api: api.races, filters: ['size'] },
  classes: { label: 'Классы', icon: 'К', desc: 'Призвания и навыки', api: api.classes, filters: ['hit_dice'] },
  skills: { label: 'Навыки', icon: 'Н', desc: 'Владение навыками', api: api.skills, filters: ['ability'] },
  spells: { label: 'Заклинания', icon: 'З', desc: 'Заклинания всех школ', api: api.spells, filters: ['school', 'level'] },
  backgrounds: { label: 'Предыстории', icon: 'П', desc: 'Происхождение героя', api: api.backgrounds, filters: [] },
  feats: { label: 'Черты', icon: 'Ч', desc: 'Особые таланты', api: api.feats, filters: [] },
  items: { label: 'Предметы', icon: 'Пр', desc: 'Оружие, броня и артефакты', api: api.items, filters: ['item_type', 'rarity'] },
}
