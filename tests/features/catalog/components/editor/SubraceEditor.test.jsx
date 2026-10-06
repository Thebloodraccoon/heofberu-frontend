import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
    render(<StrictMode><SubraceEditor raceId={1} detail={{ id: 2, name: 'Волот', description: '', tags: [], ability_bonuses: [] }} features={[]} onRefresh={vi.fn()} /></StrictMode>)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mocks.bonuses).not.toHaveBeenCalled()
    expect(mocks.tags).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('tab', { name: 'Бонусы' }))
    const heading = screen.getByText('Бонусы характеристик')
    fireEvent.click(within(heading.parentElement).getByRole('button', { name: 'Добавить' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(mocks.bonuses).toHaveBeenCalledWith(1, 2, { ability_bonuses: [{ ability: 'STR', bonus: 1 }] })
  })
})
