import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepEquipment from '@/features/characters/components/wizard/StepEquipment.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'

const classDetail = {
  id: 1,
  name: 'Воин',
  hit_dice: 'D8',
  starting_items: [{ item_id: 7, quantity: 1, item: { name: 'Кинжал' } }],
  starting_choice_groups: [
    {
      pick_count: 1,
      options: [
        { id: 101, item_id: 21, item: { name: 'Кожаный доспех' } },
        { id: 102, item_id: 22, item: { name: 'Кольчуга' } },
      ],
    },
  ],
}

const backgroundDetail = {
  id: 2,
  name: 'Благородный',
  starting_items: [{ item_id: 33, quantity: 1, item: { name: 'Печать рода' } }],
}

const renderStep = (form, update = vi.fn(), lookupsOverride = {}) =>
  renderWithProviders(
    <StepEquipment
      stepNo={6}
      total={8}
      form={{ class_id: '1', starting_choices: {}, ...form }}
      update={update}
      lookups={{ classDetail, backgroundDetail, ...lookupsOverride }}
    />,
  )

describe('StepEquipment', () => {
  it('shows fixed starting items from class and background with sources', () => {
    renderStep({})
    expect(screen.getByText('Кинжал')).toBeInTheDocument()
    expect(screen.getByText('Печать рода')).toBeInTheDocument()
    expect(screen.getAllByText('класс')).toHaveLength(1)
    expect(screen.getAllByText('предыстория')).toHaveLength(1)
  })

  it('lets the user pick an option in a choice group', async () => {
    const update = vi.fn()
    renderStep({}, update)
    await userEvent.click(screen.getByRole('button', { name: /кольчуга/i }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ starting_choices: { 'class:0': [102] } }),
    )
  })

  it('toggles a chosen option off', async () => {
    const update = vi.fn()
    renderStep({ starting_choices: { 'class:0': [101] } }, update)
    await userEvent.click(screen.getByRole('button', { name: /кожаный доспех/i }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ starting_choices: { 'class:0': [] } }),
    )
  })

  it('shows a hint when no equipment is defined', () => {
    renderStep({}, vi.fn(), { classDetail: { ...classDetail, starting_items: [] }, backgroundDetail: { ...backgroundDetail, starting_items: [] } })
    expect(screen.getByText('Снаряжение не задано.')).toBeInTheDocument()
  })
})
