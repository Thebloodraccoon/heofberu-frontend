import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepRace from '@/features/characters/components/wizard/StepRace.jsx'

const races = [
  { id: 1, name: 'Эльф', speed: 30, size: 'MEDIUM', ability_bonuses: [{ ability: 'DEX', bonus: 2 }] },
  { id: 2, name: 'Дварф' },
]

const raceDetail = {
  id: 1,
  name: 'Эльф',
  speed: 30,
  size: 'MEDIUM',
  description: 'Изящный народ',
  ability_bonuses: [{ ability: 'DEX', bonus: 2 }],
  subraces: [{ id: 5, name: 'Тёмный эльф', ability_bonuses: [{ ability: 'CHA', bonus: 1 }] }],
}
const subraceDetail = {
  id: 5,
  name: 'Тёмный эльф',
  ability_bonuses: [{ ability: 'CHA', bonus: 1 }],
}

const renderStep = (form, update = vi.fn(), lookupsOverride = {}) =>
  render(
    <StepRace
      stepNo={1}
      total={7}
      form={{ race_id: '1', subrace_id: '', ...form }}
      update={update}
      lookups={{
        races,
        raceDetail,
        raceFeatures: [{ id: 9, name: 'Тёмное зрение', description: 'Видите в темноте' }],
        subraceDetail: form.subrace_id ? subraceDetail : null,
        subraceFeatures: [],
        ...lookupsOverride,
      }}
    />,
  )

describe('StepRace', () => {
  it('lists races', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^дварф$/i })).toBeInTheDocument()
  })

  it('selecting a race resets the subrace', async () => {
    const update = vi.fn()
    renderStep({ subrace_id: '5' }, update)
    await userEvent.click(screen.getByRole('button', { name: /дварф/i }))
    expect(update).toHaveBeenCalledWith({ race_id: '2', subrace_id: '' })
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

  it('shows race features as collapsible accordions', async () => {
    renderStep({})
    expect(screen.getByText('Тёмное зрение')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /тёмное зрение/i }))
    expect(screen.getByText('Видите в темноте')).toBeInTheDocument()
  })

  it('clears the subrace', async () => {
    const update = vi.fn()
    renderStep({ subrace_id: '5' }, update)
    await userEvent.click(screen.getByRole('button', { name: /без подрасы/i }))
    expect(update).toHaveBeenCalledWith({ subrace_id: '' })
  })
})
