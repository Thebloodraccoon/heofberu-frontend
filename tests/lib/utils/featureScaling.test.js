import { describe, expect, it } from 'vitest'
import {
  featureLevelAt,
  nextScalingStep,
  normalizeScaling,
  sameScaling,
  scalingError,
  scalingMarkdown,
  scalingValueAt,
  stepBelowMin,
  toScalingDraft,
} from '@/lib/utils/featureScaling.js'

const songOfRest = {
  label: 'Доп. хиты',
  steps: [
    { level: 2, value: '1к6' },
    { level: 9, value: '1к8' },
    { level: 13, value: '1к10' },
    { level: 17, value: '1к12' },
  ],
}

describe('scalingValueAt', () => {
  it('takes the highest step the level has reached', () => {
    expect(scalingValueAt(songOfRest, 1)).toBeNull()
    expect(scalingValueAt(songOfRest, 2)).toBe('1к6')
    expect(scalingValueAt(songOfRest, 10)).toBe('1к8')
    expect(scalingValueAt(songOfRest, 20)).toBe('1к12')
  })

  it('is null without a scaling line', () => {
    expect(scalingValueAt(null, 5)).toBeNull()
    expect(scalingValueAt({ label: 'x', steps: [] }, 5)).toBeNull()
  })
})

describe('nextScalingStep', () => {
  it('returns the first step above the level', () => {
    expect(nextScalingStep(songOfRest, 10)).toEqual({ level: 13, value: '1к10' })
    expect(nextScalingStep(songOfRest, 17)).toBeNull()
  })
})

describe('normalizeScaling', () => {
  it('trims, drops half-filled steps and sorts by level', () => {
    const draft = {
      label: '  Доп. хиты ',
      steps: [
        { level: 9, value: ' 1к8 ' },
        { level: null, value: '1к10' },
        { level: 2, value: '1к6' },
        { level: 13, value: '   ' },
      ],
    }
    expect(normalizeScaling(draft)).toEqual({
      label: 'Доп. хиты',
      steps: [
        { level: 2, value: '1к6' },
        { level: 9, value: '1к8' },
      ],
    })
  })

  it('clamps levels to 1-20', () => {
    expect(normalizeScaling({ label: 'x', steps: [{ level: 25, value: 'a' }] }).steps[0].level).toBe(20)
  })

  it('is null when no step is filled', () => {
    expect(normalizeScaling({ label: 'Доп. хиты', steps: [] })).toBeNull()
    expect(normalizeScaling(toScalingDraft(null))).toBeNull()
  })
})

describe('scalingError', () => {
  it('needs a label once a step is filled', () => {
    expect(scalingError({ label: '', steps: [{ level: 2, value: '1к6' }] })).toMatch(/подпись/)
    expect(scalingError({ label: '', steps: [] })).toBeNull()
  })

  it('rejects two values on one level', () => {
    const draft = { label: 'x', steps: [{ level: 2, value: 'a' }, { level: 2, value: 'b' }] }
    expect(scalingError(draft)).toMatch(/одном уровне/)
  })

  it('accepts a valid line', () => {
    expect(scalingError(songOfRest)).toBeNull()
  })

  it('does not let the first step come before the feature level', () => {
    expect(scalingError(songOfRest, 2)).toBeNull()
    expect(scalingError(songOfRest, 3)).toMatch(/раньше 3-го уровня/)
    expect(scalingError(songOfRest, null)).toBeNull()
  })
})

describe('sameScaling', () => {
  it('compares the normalized lines', () => {
    expect(sameScaling(toScalingDraft(songOfRest), songOfRest)).toBe(true)
    expect(sameScaling({ label: '', steps: [] }, null)).toBe(true)
    expect(sameScaling({ ...songOfRest, label: 'Кость' }, songOfRest)).toBe(false)
  })
})

describe('stepBelowMin', () => {
  it('flags only steps under the feature level', () => {
    expect(stepBelowMin({ level: 1, value: 'a' }, 2)).toBe(true)
    expect(stepBelowMin({ level: 2, value: 'a' }, 2)).toBe(false)
    expect(stepBelowMin({ level: 1, value: 'a' }, null)).toBe(false)
    expect(stepBelowMin({ level: null, value: 'a' }, 2)).toBe(false)
  })
})

describe('scalingMarkdown', () => {
  it('renders the whole ladder without a level', () => {
    expect(scalingMarkdown(songOfRest)).toBe(
      String.raw`**Доп\. хиты:** 1к6 (2 ур.) → 1к8 (9 ур.) → 1к10 (13 ур.) → 1к12 (17 ур.)`,
    )
  })

  it('renders the current value and the next step for a level', () => {
    expect(scalingMarkdown(songOfRest, 10)).toBe(String.raw`**Доп\. хиты:** **1к8** · на 13 ур. — 1к10`)
    expect(scalingMarkdown(songOfRest, 20)).toBe(String.raw`**Доп\. хиты:** **1к12**`)
    expect(scalingMarkdown(songOfRest, 1)).toBe(String.raw`**Доп\. хиты:** пока нет · на 2 ур. — 1к6`)
  })

  it('escapes markdown in user text and is empty without a line', () => {
    expect(scalingMarkdown({ label: '*x*', steps: [{ level: 1, value: '_y_' }] })).toBe(String.raw`**\*x\*:** \_y\_ (1 ур.)`)
    expect(scalingMarkdown(null)).toBe('')
  })
})

describe('featureLevelAt', () => {
  const inspiration = {
    level: 1,
    scaling: { label: 'Кость', steps: [{ level: 1, value: 'к6' }, { level: 5, value: 'к8' }, { level: 10, value: 'к10' }] },
  }

  it('shows the level of the highest reached step once it passes the feature level', () => {
    expect(featureLevelAt(inspiration, 4)).toBe(1)
    expect(featureLevelAt(inspiration, 6)).toBe(5)
    expect(featureLevelAt(inspiration, 12)).toBe(10)
  })

  it('falls back to the feature level without a scaling line', () => {
    expect(featureLevelAt({ level: 3, scaling: null }, 10)).toBe(3)
    expect(featureLevelAt({ level: null, scaling: null }, 10)).toBeNull()
  })
})
