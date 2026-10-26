import { describe, expect, it } from 'vitest'
import { combatLineValue, otherSpeeds, speedSections } from '@/lib/utils/combatStats.js'

describe('combatStats', () => {
  it('signs additive lines and keeps absolute ones plain', () => {
    expect(combatLineValue({ source: 'armor', value: 16 })).toBe('16')
    expect(combatLineValue({ source: 'ability', value: 2 })).toBe('+2')
    expect(combatLineValue({ source: 'penalty', value: -10 }, 'фт')).toBe('−10 фт')
    expect(combatLineValue({ source: 'set', value: 30 }, 'фт')).toBe('30 фт')
  })

  it('lists only the speeds the character has besides walking', () => {
    expect(otherSpeeds({ walk: 30, fly: null, swim: 40, climb: null, burrow: null })).toEqual([
      { key: 'swim', label: 'Плавание', value: 40 },
    ])
    expect(otherSpeeds(undefined)).toEqual([])
  })

  it('groups speed lines by type and keeps a type that only has inactive bonuses', () => {
    const sections = speedSections({
      computed: { walk: 100, fly: null, swim: null, climb: null, burrow: null },
      breakdown: [
        { source: 'base', label: 'Волот', value: 40, speed_type: 'WALK' },
        { source: 'bonus', label: 'Камень', value: 60, speed_type: 'WALK' },
      ],
      inactive: [{ source: 'bonus', label: 'Камень', value: 10, speed_type: 'FLY', reason: 'нет скорости полёта', reason_code: 'no_speed' }],
    })

    expect(sections.map((s) => [s.type, s.total, s.lines.length, s.inactive.length])).toEqual([
      ['WALK', 100, 2, 0],
      ['FLY', null, 1, 0],
    ])
    expect(sections[1].lines[0].reason).toBeNull()
    expect(speedSections(undefined)).toEqual([])
  })

  it('decides a missing-speed bonus by reason_code, the reason text only when the code is absent', () => {
    const fly = (extra) => speedSections({ computed: { fly: null }, breakdown: [], inactive: [{ source: 'bonus', label: 'Камень', value: 10, speed_type: 'FLY', ...extra }] })[0]
    expect(fly({ reason: 'нет скорости полёта', reason_code: 'no_speed' }).inactive).toHaveLength(0)
    expect(fly({ reason: 'нет скорости полёта', reason_code: 'condition_unmet' }).inactive).toHaveLength(1)
    expect(fly({ reason: 'нет скорости полёта' }).inactive).toHaveLength(0)
    expect(fly({ reason: 'нужен надетый доспех' }).inactive).toHaveLength(1)
  })

  it('shows no number for the ignore-armor-penalty line', () => {
    expect(combatLineValue({ source: 'ignore_armor_penalty', value: 0 }, 'фт')).toBe('—')
  })
})
