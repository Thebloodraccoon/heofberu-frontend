import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import FeatureModal from '@/features/catalog/components/editor/FeaturesModal.jsx'

vi.mock('@/features/catalog/api.js', async () => {
  const actual = await vi.importActual('@/features/catalog/api.js')
  return { catalogApi: { ...actual.catalogApi, skills: { ...actual.catalogApi.skills, list: vi.fn().mockResolvedValue({ items: [] }) } } }
})

describe('race feature editor', () => {
  it('preserves the draft while navigating effects and hides the outer save action', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(<FeatureModal drawer title="Добавить особенность" subtitle="Раса: Эльф" onSave={onSave} onClose={vi.fn()} />)
    const panel = screen.getByRole('dialog', { name: 'Добавить особенность' })
    await user.type(within(panel).getByPlaceholderText('Например, Тёмное зрение'), 'Тёмное зрение')
    await user.click(within(panel).getByRole('tab', { name: 'Эффекты' }))
    await user.click(within(panel).getByRole('button', { name: 'Добавить статичный эффект' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(panel).queryByRole('button', { name: 'Создать' })).not.toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'К эффектам' }))
    await user.click(within(panel).getByRole('tab', { name: 'Описание' }))
    expect(within(panel).getByPlaceholderText('Например, Тёмное зрение')).toHaveValue('Тёмное зрение')
    expect(onSave).not.toHaveBeenCalled()
    await user.click(within(panel).getByRole('button', { name: 'Создать' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Тёмное зрение' }))
  })
})
