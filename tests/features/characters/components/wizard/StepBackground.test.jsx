import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepBackground from '@/features/characters/components/wizard/StepBackground.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'

const backgrounds = [{ id: 1, name: 'Благородный' }]

const backgroundDetail = {
  id: 1,
  name: 'Благородный',
  description: 'Знатное происхождение',
  granted_skills: [{ id: 11, name: 'Обман' }],
  starting_items: [{ item_id: 7, quantity: 2, item: { name: 'Кинжал' } }],
  features: [{ id: 3, name: 'Положение', description: 'Доступ к высшему свету' }],
}

const renderStep = (form, update = vi.fn(), lookupsOverride = {}) =>
  renderWithProviders(
    <StepBackground
      stepNo={2}
      total={7}
      form={{ background_id: '1', ...form }}
      update={update}
      lookups={{ backgrounds, backgroundDetail, ...lookupsOverride }}
    />,
  )

describe('StepBackground', () => {
  it('lists backgrounds', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /^благородный$/i })).toBeInTheDocument()
  })

  it('shows a "no background" tile that resets the selection', async () => {
    const update = vi.fn()
    renderStep({ background_id: '1' }, update)
    await userEvent.click(screen.getByRole('button', { name: /без предыстории/i }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ background_id: '', class_skill_ids: [] }))
  })

  it('selecting a background updates background_id', async () => {
    const update = vi.fn()
    renderStep({ background_id: '' }, update)
    await userEvent.click(screen.getByRole('button', { name: /благородный/i }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ background_id: '1' }))
  })

  it('shows an empty state when no backgrounds are loaded', () => {
    renderStep({}, vi.fn(), { backgrounds: [] })
    expect(screen.getByText('Предыстории не загружены')).toBeInTheDocument()
  })

  it('shows granted skills, starting items and features', async () => {
    renderStep({})
    expect(screen.getByText('Обман')).toBeInTheDocument()
    expect(screen.getByText('Кинжал')).toBeInTheDocument()
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('Положение')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /положение/i }))
    expect(screen.getByText('Доступ к высшему свету')).toBeInTheDocument()
  })
})
