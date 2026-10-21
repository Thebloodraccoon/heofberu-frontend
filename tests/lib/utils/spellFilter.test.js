import { describe, expect, it } from 'vitest'
import {
  describeOpenSpell,
  isOpenSpellEffect,
  newOpenSpellEffect,
  spellLevelRangeInverted,
  spellMetaText,
} from '@/lib/utils/spellFilter.js'

describe('describeOpenSpell', () => {
  it('is the bare name for an unfiltered effect', () => {
    expect(describeOpenSpell(newOpenSpellEffect())).toBe('любое заклинание на выбор')
    expect(describeOpenSpell({ spell_id: null, summary: [] })).toBe('любое заклинание на выбор')
  })

  it('appends the server summary joined in order', () => {
    const effect = {
      spell_id: null,
      summary: ['заговор или доступного вам уровня', 'школа: Ограждение', 'ритуал', 'из списка: Бард, Жрец'],
    }
    expect(describeOpenSpell(effect)).toBe(
      'любое заклинание на выбор (заговор или доступного вам уровня; школа: Ограждение; ритуал; из списка: Бард, Жрец)',
    )
  })

  it('ignores a missing summary', () => {
    expect(describeOpenSpell({ spell_id: null })).toBe('любое заклинание на выбор')
  })
})

describe('helpers', () => {
  it('tells an open effect from a concrete one', () => {
    expect(isOpenSpellEffect({ spell_id: null })).toBe(true)
    expect(isOpenSpellEffect({ spell_id: 4 })).toBe(false)
  })

  it('flags an inverted level range', () => {
    expect(spellLevelRangeInverted({ min_level: 'LEVEL_6', max_level: 'LEVEL_5' })).toBe(true)
    expect(spellLevelRangeInverted({ min_level: 'LEVEL_5', max_level: 'LEVEL_5' })).toBe(false)
    expect(spellLevelRangeInverted({ min_level: 'LEVEL_5', max_level: null })).toBe(false)
  })

  it('describes a spell for the picker list', () => {
    expect(spellMetaText({ level: 'LEVEL_3', school: 'EVOCATION', is_ritual: false })).toBe('3 уровень · Воплощение')
    expect(spellMetaText({ level: 'CANTRIP', school: 'DIVINATION', is_ritual: true })).toBe('Заговор · Прорицание · ритуал')
  })
})
