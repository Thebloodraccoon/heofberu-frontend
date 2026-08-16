import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  ABILITY_CAP,
  ASI_LEVELS,
  STATS,
  abilityByCode,
  abilityByKey,
  abilityName,
  baseDefaults,
  bonusMap,
  effectiveTotals,
  mod,
  pointCost,
  roll3d6,
  roll4d6DropLowest,
  rollDie,
} from '@/lib/utils/ability.js'

describe('constants', () => {
  it('defines the six core stats with unique keys and codes', () => {
    expect(STATS).toHaveLength(6)
    const keys = new Set(STATS.map((s) => s.key))
    const codes = new Set(STATS.map((s) => s.code))
    expect(keys.size).toBe(6)
    expect(codes.size).toBe(6)
  })

  it('exposes lookups for key and code', () => {
    expect(abilityByKey.strength.label).toBe('Сила')
    expect(abilityByCode.STR).toBe(abilityByKey.strength)
  })

  it('exposes ASI levels and ability cap', () => {
    expect(ASI_LEVELS).toEqual([4, 8, 12, 16, 19])
    expect(ABILITY_CAP).toBe(20)
  })
})

describe('mod', () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [14, 2],
    [15, 2],
    [20, 5],
    [30, 10],
  ])('computes modifier for score %i', (score, expected) => {
    expect(mod(score)).toBe(expected)
  })
})

describe('pointCost', () => {
  it('maps non-contiguous point-buy costs', () => {
    expect(pointCost(8)).toBe(0)
    expect(pointCost(13)).toBe(5)
    expect(pointCost(14)).toBe(7)
    expect(pointCost(15)).toBe(9)
  })

  it('returns 0 for out-of-range and unknown values', () => {
    expect(pointCost(7)).toBe(0)
    expect(pointCost(16)).toBe(0)
    expect(pointCost(undefined)).toBe(0)
    expect(pointCost(null)).toBe(0)
  })
})

describe('rollDie', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns values within [1, sides]', () => {
    for (let i = 0; i < 50; i++) {
      const v = rollDie(6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
    }
  })

  it('rolls deterministic values based on Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(rollDie(6)).toBe(6)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rollDie(6)).toBe(1)
  })
})

describe('roll4d6DropLowest', () => {
  it('drops the lowest roll and sums the rest', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const { rolls, value } = roll4d6DropLowest()
    expect(rolls).toHaveLength(4)
    expect(value).toBe(18)
  })

  it('produces values in [3, 18]', () => {
    vi.restoreAllMocks()
    for (let i = 0; i < 50; i++) {
      const { rolls, value } = roll4d6DropLowest()
      expect(rolls).toHaveLength(4)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(18)
    }
  })
})

describe('roll3d6', () => {
  it('sums three dice', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(roll3d6().rolls).toHaveLength(3)
    expect(roll3d6().value).toBe(3)
  })

  it('produces values in [3, 18]', () => {
    vi.restoreAllMocks()
    for (let i = 0; i < 50; i++) {
      expect(roll3d6().value).toBeGreaterThanOrEqual(3)
      expect(roll3d6().value).toBeLessThanOrEqual(18)
    }
  })
})

describe('bonusMap', () => {
  it('accumulates bonuses by ability', () => {
    expect(bonusMap([{ ability: 'STR', bonus: 2 }, { ability: 'STR', bonus: 1 }, { ability: 'DEX', bonus: 1 }])).toEqual({
      STR: 3,
      DEX: 1,
    })
  })

  it('supports the amount alias', () => {
    expect(bonusMap([{ ability: 'WIS', amount: 2 }])).toEqual({ WIS: 2 })
  })

  it('handles empty and nullish input', () => {
    expect(bonusMap([])).toEqual({})
    expect(bonusMap(undefined)).toEqual({})
  })
})

describe('effectiveTotals', () => {
  it('defaults base scores to 10', () => {
    expect(effectiveTotals({})).toEqual({ STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 })
  })

  it('adds bonuses keyed by code', () => {
    const totals = effectiveTotals({ strength: 12 }, { STR: 2 })
    expect(totals.STR).toBe(14)
    expect(totals.DEX).toBe(10)
  })

  it('coerces base values to numbers', () => {
    expect(effectiveTotals({ strength: '15' }, {}).STR).toBe(15)
  })
})

describe('baseDefaults', () => {
  it('returns all 10s', () => {
    expect(baseDefaults()).toEqual({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 })
  })
})

describe('abilityName', () => {
  it('returns the label for known codes', () => {
    expect(abilityName('CHA')).toBe('Харизма')
  })

  it('falls back to the code itself', () => {
    expect(abilityName('FOO')).toBe('FOO')
  })
})
