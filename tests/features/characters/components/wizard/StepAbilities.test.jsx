import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import StepAbilities from '@/features/characters/components/wizard/StepAbilities.jsx'
import { baseDefaults } from '@/lib/utils/ability.js'

const all8 = () => Object.fromEntries(Object.entries(baseDefaults()).map(([k]) => [k, 8]))

const baseForm = (overrides = {}) => ({
  ability_method: 'array',
  ability_base: {},
  ability_rolls: {},
  ...overrides,
})

const renderStep = (form, update = vi.fn(), onRoll = undefined) =>
  render(
    <StepAbilities
      stepNo={4}
      total={7}
      form={form}
      update={update}
      derived={{ bonusByCode: {}, totals: all8() }}
      onRoll={onRoll}
    />,
  )

const statRow = (label) => {
  const el = screen.getByText(label)
  return el.closest('.grid')
}

const valueCell = (label) => within(statRow(label)).getByRole('button')

const poolChip = (name) => within(screen.getByTestId('ability-pool')).getByRole('button', { name })

const Harness = ({ initial = {}, onUpdate = vi.fn() }) => {
  const [form, setForm] = useState(baseForm(initial))
  return (
    <StepAbilities
      stepNo={4}
      total={7}
      form={form}
      update={(patch) => {
        onUpdate(patch)
        setForm((f) => ({ ...f, ...patch }))
      }}
      derived={{ bonusByCode: {}, totals: all8() }}
    />
  )
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

  describe('standard array pool', () => {
    it('shows the pool of numbers', () => {
      renderStep(baseForm())
      for (const v of [15, 14, 13, 12, 10, 8]) {
        expect(poolChip(String(v))).toBeInTheDocument()
      }
    })

    it('assigns an active pool number to a stat cell', async () => {
      const update = vi.fn()
      renderStep(baseForm(), update)
      await userEvent.click(poolChip('15'))
      await userEvent.click(valueCell('Сила'))
      expect(update).toHaveBeenCalledWith({ ability_base: { strength: 15 } })
    })

    it('marks the assigned number as used and disables the chip', async () => {
      render(<Harness />)
      await userEvent.click(poolChip('15'))
      await userEvent.click(valueCell('Сила'))
      expect(poolChip('15')).toBeDisabled()
      expect(valueCell('Сила')).toHaveTextContent('15')
    })

    it('unassigns a value back to the pool', async () => {
      const update = vi.fn()
      renderStep(baseForm({ ability_base: { strength: 15 } }), update)
      await userEvent.click(valueCell('Сила'))
      expect(update).toHaveBeenCalledWith({ ability_base: {} })
    })

    it('does not assign without an active pool number', async () => {
      const update = vi.fn()
      renderStep(baseForm(), update)
      await userEvent.click(valueCell('Сила'))
      expect(update).not.toHaveBeenCalled()
    })
  })

  describe('point buy', () => {
    it('switches to point-buy and resets stats to 8', async () => {
      const update = vi.fn()
      renderStep(baseForm(), update)
      await userEvent.click(screen.getByRole('button', { name: /по очкам \(27\)/i }))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_method: 'pointbuy', ability_base: all8(), ability_rolls: {} }),
      )
    })

    it('shows the remaining budget and the price hint', () => {
      renderStep(baseForm({ ability_method: 'pointbuy', ability_base: all8() }))
      expect(screen.getByText('Осталось очков: 27')).toBeInTheDocument()
      expect(screen.getByText(/Цена: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9/)).toBeInTheDocument()
      expect(screen.queryByTestId('ability-pool')).not.toBeInTheDocument()
    })

    it('increments a stat with a counter and recalculates the budget live', async () => {
      render(<Harness initial={{ ability_method: 'pointbuy' }} />)
      expect(screen.getByText('Осталось очков: 27')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Увеличить Сила' }))
      expect(within(statRow('Сила')).getByText('9')).toBeInTheDocument()
      expect(screen.getByText('Осталось очков: 26')).toBeInTheDocument()
    })

    it('disables the minus button at the minimum value', () => {
      renderStep(baseForm({ ability_method: 'pointbuy', ability_base: all8() }))
      expect(screen.getByRole('button', { name: 'Уменьшить Сила' })).toBeDisabled()
    })

    it('disables the plus button when the budget is exhausted and allows decrement', async () => {
      render(
        <Harness
          initial={{
            ability_method: 'pointbuy',
            ability_base: { ...all8(), strength: 15, dexterity: 15, constitution: 15 },
          }}
        />,
      )
      expect(screen.getByRole('button', { name: 'Увеличить Сила' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Уменьшить Сила' })).not.toBeDisabled()
      await userEvent.click(screen.getByRole('button', { name: 'Уменьшить Сила' }))
      expect(screen.getByText('Осталось очков: 2')).toBeInTheDocument()
    })

    it('does not allow exceeding the maximum value', async () => {
      render(<Harness initial={{ ability_method: 'pointbuy', ability_base: { ...all8(), strength: 15 } }} />)
      expect(screen.getByRole('button', { name: 'Увеличить Сила' })).toBeDisabled()
    })
  })

  describe('dice rolls', () => {
    it('rolls dice, writes rolls and notifies onRoll for every stat', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const update = vi.fn()
      const onRoll = vi.fn()
      renderStep(baseForm(), update, onRoll)
      await userEvent.click(screen.getByRole('button', { name: /бросок 4d6/i }))

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          ability_method: 'dice4',
          ability_base: {},
          ability_rolls: expect.any(Object),
        }),
      )
      const patch = update.mock.calls.find(([p]) => p.ability_method === 'dice4')[0]
      expect(Object.values(patch.ability_rolls).every((r) => r.value === 18)).toBe(true)
      expect(onRoll).toHaveBeenCalledTimes(6)
      expect(onRoll).toHaveBeenCalledWith(expect.objectContaining({ dice: [6, 6, 6, 6], total: 18 }))
    })

    it('rerolls and resets assignments', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      const update = vi.fn()
      renderStep(
        baseForm({
          ability_method: 'dice4',
          ability_base: { strength: 18 },
          ability_rolls: { strength: { rolls: [6, 6, 6, 6], value: 18 } },
        }),
        update,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Перебросить кости' }))
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ ability_base: {}, ability_rolls: expect.any(Object) }),
      )
    })

    it('does not show dice breakdown in the pool and removes the corner hint', () => {
      const rolls = Object.fromEntries(
        ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((k, i) => [
          k,
          { rolls: [6, 6, 6, 6], value: 10 + i },
        ]),
      )
      renderStep(baseForm({ ability_method: 'dice4', ability_rolls: rolls }))
      expect(screen.getByRole('button', { name: 'Перебросить кости' })).toBeInTheDocument()
      expect(poolChip('12')).not.toHaveTextContent('6')
      expect(screen.queryByText(/Результаты бросков появятся/i)).not.toBeInTheDocument()
    })
  })
})
