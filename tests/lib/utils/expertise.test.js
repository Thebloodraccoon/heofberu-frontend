import { describe, it, expect } from 'vitest'
import { expertiseBudget, expertiseGrantFromFeature } from '@/lib/utils/expertise.js'

describe('expertiseGrantFromFeature', () => {
  it('returns 0 when expertise is not mentioned', () => {
    expect(expertiseGrantFromFeature({ name: 'Ловкость рук', description: 'Бонус к навыкам' })).toBe(0)
    expect(expertiseGrantFromFeature({ name: '', description: '' })).toBe(0)
  })

  it('handles missing feature object', () => {
    expect(expertiseGrantFromFeature(undefined)).toBe(0)
    expect(expertiseGrantFromFeature(null)).toBe(0)
  })

  it('matches expertise keywords case-insensitively', () => {
    expect(expertiseGrantFromFeature({ name: 'Экспертиза', description: '' })).toBe(2)
    expect(expertiseGrantFromFeature({ name: 'Expertise', description: '' })).toBe(2)
    expect(expertiseGrantFromFeature({ name: '', description: 'Вы получаете экспертизу' })).toBe(2)
  })

  it('prefers an explicit digit over words', () => {
    expect(
      expertiseGrantFromFeature({ name: '', description: 'Вы получаете экспертизу в двух навыках (2 навыка)' }),
    ).toBe(2)
  })

  it.each([
    ['один', 1],
    ['одну', 1],
    ['two', 2],
    ['двух', 2],
    ['три', 3],
    ['трёх', 3],
    ['четыре', 4],
  ])('parses the number word %s', (word, expected) => {
    expect(expertiseGrantFromFeature({ name: '', description: `экспертиза в ${word} навыке` })).toBe(expected)
  })

  it('defaults to 2 when expertise is mentioned without a number', () => {
    expect(expertiseGrantFromFeature({ name: 'Экспертиза', description: 'Выберите навыки' })).toBe(2)
  })
})

describe('expertiseBudget', () => {
  const features = [
    { name: 'Экспертиза', description: '2 навыка', level: 1 },
    { name: 'Улучшенная экспертиза', description: 'ещё один навык', level: 4 },
    { name: 'Проворство', description: 'Простое умение', level: 2 },
  ]

  it('sums grants from features unlocked at the level', () => {
    expect(expertiseBudget(features, 1)).toBe(2)
    expect(expertiseBudget(features, 2)).toBe(2)
    expect(expertiseBudget(features, 4)).toBe(3)
  })

  it('treats features without a level as always available', () => {
    const always = [{ name: 'Экспертиза', description: 'два', level: null }]
    expect(expertiseBudget(always, 1)).toBe(2)
    expect(expertiseBudget(always, 20)).toBe(2)
  })

  it('ignores locked higher-level features', () => {
    expect(expertiseBudget(features, 3)).toBe(2)
  })

  it('returns 0 for empty input', () => {
    expect(expertiseBudget([])).toBe(0)
    expect(expertiseBudget(undefined, 5)).toBe(0)
  })
})
