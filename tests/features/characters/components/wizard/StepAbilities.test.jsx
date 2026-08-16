import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import { baseDefaults } from '@/lib/utils/ability.js'

const all8 = () => Object.fromEntries(Object.entries(baseDefaults()).map(([k]) => [k, 8]))

const baseForm = (overrides = {}) => ({
  ability_method: 'manual',
  ability_base: baseDefaults(),
  ability_rolls: {},
  ...overrides,
})

const renderStep = (form, update = vi.fn()) =>
  render(
    <StepAbilities
      stepNo={1}
      total={6}
      form={form}
      update={update}
      derived={{ bonusByCode: {}, totals: baseDefaults() }}
    />,
  )

const statRow = (label) => {
  const el = screen.getByText(label)
  return el.closest('.grid')
}

afterEach(() => vi.restoreAllMocks())

describe('StepAbilities', () => {
  it('renders the header and all six stats', () => {
    renderStep(baseForm())
    expect(screen.getByText('Характеристики')).toBeInTheDocument()
    for (const label of ['Сила', 'Ловкость', 'Телосложение', 'Интеллект', 'Мудрость', 'Харизма']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('switches to the standard array method', async () => {
    const update = vi.fn()
    renderStep(baseForm(), update)
    await userEvent.click(screen.getByRole('button', { name: /стандартный набор/i }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        ability_method: 'array',
        ability_base: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
        ability_rolls: {},
      }),
    )
  })

  it('switches to point-buy and resets stats to 8', async () => {
    const update = vi.fn()
    renderStep(baseForm(), update)
    await userEvent.click(screen.getByRole('button', { name: /по очкам \(27\)/i }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ ability_method: 'pointbuy', ability_base: all8(), ability_rolls: {} }),
    )
  })

  describe('point-buy', () => {
    it('shows the remaining budget and raises a stat on +', async () => {
      const update = vi.fn()
      renderStep(baseForm({ ability_method: 'pointbuy', ability_base: all8() }), update)
      expect(screen.getByText('Осталось очков: 27')).toBeInTheDocument()

      await userEvent.click(within(statRow('Сила')).getByText('+'))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: expect.objectContaining({ strength: 9 }) }),
      )
    })

    it('lowers a stat on −', async () => {
      const update = vi.fn()
      renderStep(baseForm({ ability_method: 'pointbuy', ability_base: { ...all8(), strength: 10 } }), update)
      await userEvent.click(within(statRow('Сила')).getByText('−'))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: expect.objectContaining({ strength: 9 }) }),
      )
    })

    it('disables + at the max value and when the budget is spent', () => {
      renderStep(
        baseForm({
          ability_method: 'pointbuy',
          ability_base: { strength: 15, dexterity: 15, constitution: 15, intelligence: 8, wisdom: 8, charisma: 8 },
        }),
      )
      expect(screen.getByText('Осталось очков: 0')).toBeInTheDocument()
      expect(within(statRow('Сила')).getByText('+')).toBeDisabled()
    })

    it('disables − at the minimum value', () => {
      renderStep(baseForm({ ability_method: 'pointbuy', ability_base: all8() }))
      expect(within(statRow('Сила')).getByText('−')).toBeDisabled()
    })

    it('shows the per-value cost tag', () => {
      renderStep(
        baseForm({
          ability_method: 'pointbuy',
          ability_base: { ...all8(), strength: 15 },
        }),
      )
      expect(within(statRow('Сила')).getByText('9 очк.')).toBeInTheDocument()
    })
  })

  describe('standard array', () => {
    it('renders native selects for each stat', () => {
      renderStep(baseForm({ ability_method: 'array', ability_base: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 } }))
      expect(screen.getAllByRole('combobox')).toHaveLength(6)
    })

    it('disables duplicate values in a select', () => {
      renderStep(
        baseForm({
          ability_method: 'array',
          ability_base: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
        }),
      )
      const selects = screen.getAllByRole('combobox')
      const last = selects[5]
      expect(within(last).getByRole('option', { name: '15' })).toBeDisabled()
      expect(within(last).getByRole('option', { name: '8' })).not.toBeDisabled()
    })
  })

  describe('manual', () => {
    it('clamps typed values to [3, 20]', async () => {
      const update = vi.fn()
      renderStep(baseForm(), update)
      const input = within(statRow('Сила')).getByDisplayValue('10')
      await userEvent.clear(input)
      await userEvent.type(input, '25')
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: expect.objectContaining({ strength: 20 }) }),
      )
    })

    it('clamps low values to 3', async () => {
      const update = vi.fn()
      renderStep(baseForm(), update)
      const input = within(statRow('Сила')).getByDisplayValue('10')
      await userEvent.clear(input)
      await userEvent.type(input, '1')
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: expect.objectContaining({ strength: 3 }) }),
      )
    })
  })

  describe('dice rolls', () => {
    it('rolls 4d6 drop lowest and writes base values', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const update = vi.fn()
      renderStep(baseForm(), update)
      await userEvent.click(screen.getByRole('button', { name: /бросок 4d6/i }))

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          ability_method: 'dice4',
          ability_rolls: expect.any(Object),
        }),
      )
      const patch = update.mock.calls.find(([p]) => p.ability_method === 'dice4')[0]
      expect(Object.values(patch.ability_rolls).every((r) => r.value === 18)).toBe(true)
      expect(Object.values(patch.ability_base).every((v) => v === 18)).toBe(true)
    })

    it('renders roll chips and shows a reroll button', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const update = vi.fn()
      renderStep(
        baseForm({
          ability_method: 'dice4',
          ability_base: { ...baseDefaults(), strength: 18 },
          ability_rolls: { strength: { rolls: [6, 6, 6, 6], value: 18 } },
        }),
        update,
      )
      expect(screen.getAllByText('= 18').length).toBeGreaterThan(0)
      await userEvent.click(screen.getByRole('button', { name: 'Перебросить кости' }))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: expect.any(Object), ability_rolls: expect.any(Object) }),
      )
    })
  })
})
