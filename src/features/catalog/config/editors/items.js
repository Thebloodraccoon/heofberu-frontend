import { GEAR_FILTERS } from '../../components/editor/itemFilters.js'
import { gearTypeLabels } from '@/lib/i18n/index.js'
import { itemKindCfg } from './itemShared.js'
import { opt } from './shared.js'

// Прочие предметы (kind GEAR: зелья, кольца, плащи…): подтип (в строке с весом
// и ценой) и магический бонус — в «Основном», вторая вкладка — «Влияние на КД и
// скорость» (кольцо защиты, сапоги скорости). Оружие, доспехи и
// инструменты — свои редакторы (weapons.js, armor.js, tools.js).
export const itemsCfg = itemKindCfg({
  kind: 'GEAR',
  label: 'Предметы',
  singular: 'предмет',
  newTitle: 'Новый предмет',
  filters: GEAR_FILTERS,
  statsRowField: { key: 'subtype', label: 'Подтип', type: 'select', options: opt(gearTypeLabels) },
  sections: [{ type: 'itemEffects', key: 'item_effects' }],
})
