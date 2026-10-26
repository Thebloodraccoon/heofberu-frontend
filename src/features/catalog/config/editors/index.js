import { catalog } from '../../catalog.js'
import { racesCfg } from './races.js'
import { classesCfg } from './classes.js'
import { skillsCfg } from './skills.js'
import { spellsCfg } from './spells.js'
import { backgroundsCfg } from './backgrounds.js'
import { featsCfg } from './feats.js'
import { itemsCfg } from './items.js'
import { weaponsCfg } from './weapons.js'
import { armorCfg } from './armor.js'
import { toolsCfg } from './tools.js'
import { featuresCfg } from './features.js'

export {
  SPELL_LEVEL_KEYS,
  buildSpellSlotPayload,
  featurePayload,
  featuresFromRecord,
  persistFeatureEffects,
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
  // Предметы — по редактору на вид (kind): один справочник /items, разные формы.
  weapons: { ...catalog.weapons, ...weaponsCfg },
  armor: { ...catalog.armor, ...armorCfg },
  tools: { ...catalog.tools, ...toolsCfg },
  gear: { ...catalog.items, ...itemsCfg },
  feats: { ...catalog.feats, ...featsCfg },
  features: { ...catalog.features, ...featuresCfg },
}
