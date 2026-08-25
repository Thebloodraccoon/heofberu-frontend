import { catalog } from '../../catalog.js'
import { racesCfg } from './races.js'
import { classesCfg } from './classes.js'
import { skillsCfg } from './skills.js'
import { spellsCfg } from './spells.js'
import { backgroundsCfg } from './backgrounds.js'
import { featsCfg } from './feats.js'
import { itemsCfg } from './items.js'
import { featuresCfg } from './features.js'

export {
  SPELL_LEVEL_KEYS,
  buildSpellSlotPayload,
  featurePayload,
  featuresFromRecord,
  saveSpellSlots,
  sortedByLevel,
  subclassPayload,
  subracePayload,
} from './shared.js'

export const editorConfig = {
  races: { ...catalog.races, ...racesCfg },
  classes: { ...catalog.classes, ...classesCfg },
  skills: { ...catalog.skills, ...skillsCfg },
  spells: { ...catalog.spells, ...spellsCfg },
  backgrounds: { ...catalog.backgrounds, ...backgroundsCfg },
  feats: { ...catalog.feats, ...featsCfg },
  items: { ...catalog.items, ...itemsCfg },
  features: { ...catalog.features, ...featuresCfg },
}
