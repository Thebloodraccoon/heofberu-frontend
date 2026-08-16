import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepOrigin from '@/features/characters/components/wizard/StepOrigin.jsx'

const races = [
  { id: 1, name: 'Эльф' },
  { id: 2, name: 'Дварф' },
]
const backgrounds = [{ id: 1, name: 'Благородный' }]

const raceDetail = {
  id: 1,
  name: 'Эльф',
  speed: 30,
  size: 'MEDIUM',
  description: 'Изящный народ',
  ability_bonuses: [{ ability: 'DEX', bonus: 2 }],
  subraces: [{ id: 5, name: 'Тёмный эльф' }],
}
const subraceDetail = {
  id: 5,
  name: 'Тёмный эльф',
  ability_bonuses: [{ ability: 'CHA', bonus: 1 }],
}

const renderStep = (form, update = vi.fn(), lookupsOverride = {}) =>
  render(
    <StepOrigin
      stepNo={1}
      total={6}
      form={{ race_id: '1', subrace_id: '', background_id: '', ...form }}
      update={update}
      lookups={{
        races,
        backgrounds,
        raceDetail,
        raceFeatures: [{ id: 9, name: 'Тёмное зрение', description: 'Видите в темноте' }],
        backgroundDetail: { id: 1, name: 'Благородный', description: 'Знатное происхождение', granted_skills: [] },
        subraceDetail: form.subrace_id ? subraceDetail : null,
        subraceFeatures: [],
        ...lookupsOverride,
      }}
    />,
  )

describe('StepOrigin', () => {
  it('lists races and backgrounds', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /^эльф$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^дварф$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^благородный$/i })).toBeInTheDocument()
  })

  it('selecting a race resets the subrace', async () => {
    const update = vi.fn()
    renderStep({ subrace_id: '5' }, update)
    await userEvent.click(screen.getByRole('button', { name: /дварф/i }))
    expect(update).toHaveBeenCalledWith({ race_id: '2', subrace_id: '' })
  })

  it('selecting a background updates background_id', async () => {
    const update = vi.fn()
    renderStep({}, update)
    await userEvent.click(screen.getByRole('button', { name: /благородный/i }))
    expect(update).toHaveBeenCalledWith({ background_id: '1' })
  })

  it('shows race bonuses', () => {
    renderStep({})
    expect(screen.getByText('Ловкость +2')).toBeInTheDocument()
  })

  it('merges race and subrace bonuses', () => {
    renderStep({ subrace_id: '5' })
    expect(screen.getByText('Ловкость +2')).toBeInTheDocument()
    expect(screen.getAllByText('Харизма +1').length).toBeGreaterThan(0)
  })

  it('shows race features', () => {
    renderStep({})
    expect(screen.getByText('Тёмное зрение')).toBeInTheDocument()
    expect(screen.getByText('Видите в темноте')).toBeInTheDocument()
  })

  it('shows an empty state when no backgrounds are loaded', () => {
    renderStep({}, vi.fn(), { backgrounds: [] })
    expect(screen.getByText('Предыстории не загружены')).toBeInTheDocument()
  })

  it('clears the subrace', async () => {
    const update = vi.fn()
    renderStep({ subrace_id: '5' }, update)
    await userEvent.click(screen.getByRole('button', { name: /без подрасы/i }))
    expect(update).toHaveBeenCalledWith({ subrace_id: '' })
  })
})
