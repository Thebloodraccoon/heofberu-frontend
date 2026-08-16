import { armorProficiencyLabels, label } from '@/lib/i18n/index.js'

export const ATTACK_TYPES = ['MELEE_ATTACK', 'RANGED_ATTACK']
export const DICE_TYPES = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100']
export const DAMAGE_TYPES = [
  'SLASHING', 'PIERCING', 'BLUDGEONING', 'ACID', 'COLD', 'FIRE', 'FORCE',
  'LIGHTNING', 'NECROTIC', 'POISON', 'PSYCHIC', 'RADIANT', 'THUNDER',
]
export const CONDITIONS = [
  'BLINDED', 'CHARMED', 'DEAFENED', 'FRIGHTENED', 'GRAPPLED', 'INCAPACITATED',
  'INVISIBLE', 'PARALYZED', 'PETRIFIED', 'POISONED', 'PRONE', 'RESTRAINED',
  'STUNNED', 'UNCONSCIOUS', 'EXHAUSTION',
]

export const ARMOR_OPTIONS = ['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD'].map((v) => ({
  value: v,
  label: armorProficiencyLabels[v] ?? label(v),
}))

export const SPELL_LEVEL_ORDER = [
  'CANTRIP', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4',
  'LEVEL_5', 'LEVEL_6', 'LEVEL_7', 'LEVEL_8', 'LEVEL_9',
]

export const num = (v) => (v === '' || v === undefined || v === null ? null : Number(v))
