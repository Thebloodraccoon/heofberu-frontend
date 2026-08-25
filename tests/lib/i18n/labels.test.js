import { describe, it, expect } from 'vitest'
import { fieldLabel, label, ruLevel } from '@/lib/i18n/index.js'

describe('label', () => {
  it('returns em dash for empty values', () => {
    expect(label(null)).toBe('—')
    expect(label(undefined)).toBe('—')
    expect(label('')).toBe('—')
  })

  it('looks up known enum values', () => {
    expect(label('STR')).toBe('Сила')
    expect(label('EVOCATION')).toBe('Воплощение')
    expect(label('D12')).toBe('к12')
  })

  it('humanizes unknown values', () => {
    expect(label('crimson_tide')).toBe('Crimson Tide')
    expect(label(42)).toBe('42')
  })
})

describe('fieldLabel', () => {
  it('returns known field labels', () => {
    expect(fieldLabel('hit_dice')).toBe('Кость хитов')
    expect(fieldLabel('ability_bonuses')).toBe('Бонусы характеристик')
  })

  it('humanizes unknown field keys', () => {
    expect(fieldLabel('custom_field')).toBe('Custom Field')
  })
})

describe('ruLevel', () => {
  it('returns empty for missing levels', () => {
    expect(ruLevel(null)).toBe('')
    expect(ruLevel('')).toBe('')
    expect(ruLevel(undefined)).toBe('')
  })

  it('formats a level in Russian', () => {
    expect(ruLevel(3)).toBe('3-й уровень')
    expect(ruLevel(12)).toBe('12-й уровень')
  })
})
