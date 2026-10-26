import { describe, expect, it } from 'vitest'
import { splitEffectsSummary } from '@/lib/utils/effectsSummary.js'

const FIXED = '<p>Вы получаете:</p><ul><li>Скорость: ходьба +60 фт.</li></ul>'
const CHOICES = '<p>У вас есть выбор:</p><ul><li>Навыки (выберите 1): любой</li></ul>'

describe('splitEffectsSummary', () => {
  it('splits the summary into fixed effects and choices, without their intro lines', () => {
    expect(splitEffectsSummary(`${FIXED}\n\n${CHOICES}`)).toEqual({
      fixed: '<ul><li>Скорость: ходьба +60 фт.</li></ul>',
      choices: '<ul><li>Навыки (выберите 1): любой</li></ul>',
    })
  })

  it('keeps a part empty when the feature has only the other one', () => {
    expect(splitEffectsSummary(FIXED).choices).toBe('')
    expect(splitEffectsSummary(CHOICES).fixed).toBe('')
    expect(splitEffectsSummary(undefined)).toEqual({ fixed: '', choices: '' })
  })
})
