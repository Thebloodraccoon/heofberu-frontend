import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepFeat from '@/features/characters/components/wizard/StepFeat.jsx'

const feats = [
  { id: 1, name: 'Проворный', description: 'Быстрый' },
  {
    id: 2,
    name: 'Сильный удар',
    description: 'Мощный',
    ability_score_increases: [
      { id: 21, ability: 'STR', amount: 1 },
      { id: 22, ability: 'CHA', amount: 1 },
    ],
  },
  { id: 3, name: 'Крепкий', description: '', prerequisite_ability: 'CON', prerequisite_minimum_score: 15 },
]

const totals = { STR: 14, DEX: 10, CON: 13, INT: 10, WIS: 10, CHA: 12 }

const renderStep = (form = {}, update = vi.fn()) =>
  render(
    <StepFeat
      stepNo={6}
      total={6}
      form={{ feat_id: '', feat_asi_id: '', ...form }}
      update={update}
      lookups={{ feats }}
      derived={{ totals }}
    />,
  )

describe('StepFeat', () => {
  it('requires an origin feat (no optional hint)', () => {
    renderStep()
    expect(screen.getByText(/обязательно/i)).toBeInTheDocument()
  })

  it('selects a feat and resets the asi option', async () => {
    const update = vi.fn()
    renderStep({ feat_id: '1', feat_asi_id: '21' }, update)
    await userEvent.click(screen.getByRole('button', { name: /сильный удар/i }))
    expect(update).toHaveBeenCalledWith({ feat_id: '2', feat_asi_id: '' })
  })

  it('deselects the current feat', async () => {
    const update = vi.fn()
    renderStep({ feat_id: '1' }, update)
    await userEvent.click(screen.getByRole('button', { name: /проворный/i }))
    expect(update).toHaveBeenCalledWith({ feat_id: '', feat_asi_id: '' })
  })

  it('offers ability-score options for feats that have them', async () => {
    const update = vi.fn()
    renderStep({ feat_id: '2' }, update)
    await userEvent.click(screen.getByRole('button', { name: /сила \+1/i }))
    expect(update).toHaveBeenCalledWith({ feat_asi_id: '21' })
  })

  it('shows no options for plain feats', () => {
    renderStep({ feat_id: '1' })
    expect(screen.queryByText(/вариант улучшения/i)).not.toBeInTheDocument()
  })

  it('disables feats whose prerequisites are not met', () => {
    renderStep()
    expect(screen.getByRole('button', { name: /крепкий/i })).toBeDisabled()
  })

  it('resets via the reset link', async () => {
    const update = vi.fn()
    renderStep({ feat_id: '2', feat_asi_id: '22' }, update)
    await userEvent.click(screen.getByRole('button', { name: /сбросить/i }))
    expect(update).toHaveBeenCalledWith({ feat_id: '', feat_asi_id: '' })
  })
})
