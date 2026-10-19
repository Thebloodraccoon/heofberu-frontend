import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'

const state = vi.hoisted(() => ({ mutate: vi.fn(), user: { id: 5, username: 'dara' } }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: state.user }) }))
vi.mock('@/features/users/queries.js', () => ({ useUsers: () => ({ data: [] }) }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/campaigns/queries.js', () => ({ useSetCharacterVisibility: () => ({ mutate: state.mutate, isPending: false }) }))
vi.mock('@/components/sheet/RollHistory.jsx', () => ({ default: () => null }))
vi.mock('@/features/characters/components/sheet/DicePicker.jsx', () => ({ default: () => <button type="button">Бросок</button> }))

const render_ = (character) => render(<MemoryRouter><SheetHeader character={{ id: 14, name: 'Дара', level: 1, owner_id: 5, ...character }} onRollFree={vi.fn()} onOpenSettings={vi.fn()} /></MemoryRouter>)

describe('sheet header visibility eye', () => {
  beforeEach(() => { state.mutate.mockClear(); state.user = { id: 5, username: 'dara' } })

  it('lets the owner open a hidden character right after the dice button', async () => {
    const user = userEvent.setup()
    render_({ public_visibility: 'hidden' })
    const buttons = screen.getAllByRole('button')
    const eye = screen.getByRole('button', { name: 'Персонаж скрыт — открыть для всех' })
    expect(buttons.indexOf(eye)).toBe(buttons.findIndex((button) => button.textContent === 'Бросок') + 1)
    expect(eye).toHaveAttribute('aria-pressed', 'false')
    await user.click(eye)
    expect(state.mutate).toHaveBeenCalledWith({ id: 14, visibility: 'full' }, expect.any(Object))
  })

  it('hides an open character', async () => {
    const user = userEvent.setup()
    render_({ public_visibility: 'full' })
    await user.click(screen.getByRole('button', { name: 'Персонаж открыт для всех — скрыть' }))
    expect(state.mutate).toHaveBeenCalledWith({ id: 14, visibility: 'hidden' }, expect.any(Object))
  })

  it('is not offered to a GM looking at someone else’s character', () => {
    state.user = { id: 99, username: 'gm' }
    render_({ public_visibility: 'hidden' })
    expect(screen.queryByRole('button', { name: /Персонаж (скрыт|открыт)/ })).not.toBeInTheDocument()
  })
})
