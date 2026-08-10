import { api } from './api/endpoints.js'

export const catalog = {
  races: { label: 'Расы', icon: 'Р', desc: 'Народы и их способности', api: api.races, filters: ['size'], featuresApi: api.races.features.list },
  classes: { label: 'Классы', icon: 'К', desc: 'Призвания и навыки', api: api.classes, filters: ['hit_dice'], featuresApi: api.classes.features.list },
  skills: { label: 'Навыки', icon: 'Н', desc: 'Владение навыками', api: api.skills, filters: ['ability'] },
  spells: { label: 'Заклинания', icon: 'З', desc: 'Заклинания всех школ', api: api.spells, filters: ['school', 'level', 'cast_time', 'duration', 'damage_type', 'is_concentration', 'is_ritual', 'available_classes'] },
  backgrounds: { label: 'Предыстории', icon: 'П', desc: 'Происхождение героя', api: api.backgrounds, filters: [], featuresApi: api.backgrounds.features.list },
  feats: { label: 'Черты', icon: 'Ч', desc: 'Особые таланты', api: api.feats, filters: [], featuresApi: api.feats.features.list },
  items: { label: 'Предметы', icon: 'Пр', desc: 'Оружие, броня и артефакты', api: api.items, filters: ['item_type', 'rarity'] },
  features: { label: 'Особенности', icon: 'Ос', desc: 'Особенности вне классов и рас', api: api.features, filters: [], listParams: { source_type: 'OTHER' } },
}
