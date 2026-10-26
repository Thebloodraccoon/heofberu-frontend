import { StrictMode } from 'react'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SubraceEditor from '@/features/catalog/components/editor/SubraceEditor.jsx'

const mocks = vi.hoisted(() => ({ bonuses: vi.fn(), tags: vi.fn() }))
vi.mock('@/features/catalog/api.js', async () => {
  const actual = await vi.importActual('@/features/catalog/api.js')
  return { catalogApi: { ...actual.catalogApi, races: { ...actual.catalogApi.races, subraces: { ...actual.catalogApi.races.subraces, abilityBonuses: mocks.bonuses, tags: mocks.tags } } } }
})

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

describe('SubraceEditor autosave', () => {
  it('does not save on opening in StrictMode, but saves a changed bonus', async () => {
    vi.useFakeTimers()
    mocks.bonuses.mockResolvedValue({})
    renderWithProviders(<StrictMode><SubraceEditor raceId={1} detail={{ id: 2, name: 'Волот', description: '', tags: [], ability_bonuses: [] }} features={[]} onRefresh={vi.fn()} /></StrictMode>, { auth: false })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mocks.bonuses).not.toHaveBeenCalled()
    expect(mocks.tags).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Бонусы' }))
    // Как статичный эффект: панель справа → экран выбора характеристики → «Сохранить».
    fireEvent.click(screen.getByRole('button', { name: 'Добавить бонус' }))
    const panel = screen.getByRole('dialog', { name: 'Изменение характеристик: подраса «Волот»' })
    expect(within(panel).getByText('Бонусы характеристик')).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Добавить увеличение' }))
    fireEvent.click(within(panel).getByRole('button', { name: /^Сила/ }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Готово' }))
    expect(within(panel).queryByPlaceholderText('новый макс.')).not.toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Сохранить' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mocks.bonuses).toHaveBeenCalledWith(1, 2, { ability_bonuses: [{ ability: 'STR', bonus: 1 }] })
  })
})
