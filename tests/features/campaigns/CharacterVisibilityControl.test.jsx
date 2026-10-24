import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CharacterVisibilityControl from '@/features/campaigns/components/CharacterVisibilityControl.jsx'

const state = vi.hoisted(() => ({ mutate: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/campaigns/queries.js', () => ({ useSetCharacterVisibility: () => ({ mutate: state.mutate, isPending: false }) }))

describe('character public visibility', () => {
  it('switches visibility and links to the public card once it is shown', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MemoryRouter><CharacterVisibilityControl character={{ id: 12, public_visibility: 'hidden' }} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Скрыт' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('link', { name: /Публичная карточка/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Концепт' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Открыт' }))
    expect(state.mutate).toHaveBeenCalledWith({ id: 12, visibility: 'full' }, expect.any(Object))
    rerender(<MemoryRouter><CharacterVisibilityControl character={{ id: 12, public_visibility: 'full' }} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Публичная карточка/ })).toHaveAttribute('href', '/characters/12/public')
  })

  it('does not resend the current visibility', async () => {
    state.mutate.mockClear()
    const user = userEvent.setup()
    render(<MemoryRouter><CharacterVisibilityControl character={{ id: 12, public_visibility: 'full' }} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Открыт' }))
    expect(state.mutate).not.toHaveBeenCalled()
  })
})
