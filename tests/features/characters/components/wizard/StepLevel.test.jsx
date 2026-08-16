import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepLevel from '@/features/characters/components/wizard/StepLevel.jsx'

const derived = { dieSides: 8, conMod: 1, hpLevel1: 9, avgGain: 6 }

const renderStep = (form, update = vi.fn()) =>
  render(
    <StepLevel
      stepNo={5}
      total={7}
      form={{ level: '1', hp_mode: 'average', rolled_dice: {}, ...form }}
      update={update}
      lookups={{}}
      derived={derived}
    />,
  )

describe('StepLevel', () => {
  it('bounds the slider between 1 and 20', () => {
    renderStep({})
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '1')
    expect(slider).toHaveAttribute('max', '20')
  })

  it('changes the level through the slider', () => {
    const update = vi.fn()
    renderStep({}, update)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } })
    expect(update).toHaveBeenCalledWith({ level: '3' })
  })

  it('clamps the level at the bounds', () => {
    const update = vi.fn()
    renderStep({ level: '10' }, update)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })
    expect(update).toHaveBeenCalledWith({ level: '20' })
  })

  it('shows the current level', () => {
    renderStep({ level: '7' })
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('7')
  })

  it('shows starting HP for level 1', () => {
    renderStep({})
    expect(
      screen.getByText((_, node) => node?.textContent === 'Уровень 1: к8 + 1 = 9 HP'),
    ).toBeInTheDocument()
  })

  describe('HP modes', () => {
    it('switches to roll mode', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'average' }, update)
      await userEvent.click(screen.getByRole('button', { name: /броски кубика/i }))
      expect(update).toHaveBeenCalledWith({ hp_mode: 'roll' })
    })

    it('switches to average mode', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'roll' }, update)
      await userEvent.click(screen.getByRole('button', { name: /среднее/i }))
      expect(update).toHaveBeenCalledWith({ hp_mode: 'average' })
    })

    it('does not offer a manual mode', () => {
      renderStep({})
      expect(screen.queryByText(/вручную/i)).not.toBeInTheDocument()
    })

    it('hints that rolls happen on the review step', () => {
      renderStep({ hp_mode: 'roll' })
      expect(screen.getByText(/Кости будут брошены на шаге «Сводка»/)).toBeInTheDocument()
    })
  })
})
