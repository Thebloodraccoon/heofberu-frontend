import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InspirationModal from '@/features/characters/components/sheet/InspirationModal.jsx'
import { charactersApi } from '@/features/characters/api.js'
import { renderWithProviders } from '@tests/helpers/render.jsx'

vi.mock('@/features/characters/api.js', () => ({ charactersApi: { update: vi.fn(() => Promise.resolve({})) } }))

describe('InspirationModal', () => {
  it('shows the count big, adds and takes with the two buttons and saves the result', async () => {
    const onClose = vi.fn()
    renderWithProviders(<InspirationModal character={{ id: 3, inspiration: 1 }} onClose={onClose} onError={vi.fn()} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Очки вдохновения · от 0 до 13')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Отнять' }))
    expect(screen.getByText('2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(charactersApi.update).toHaveBeenCalledWith(3, { inspiration: 2 })
    expect(onClose).toHaveBeenCalled()
  })

  it('cannot take below zero', () => {
    renderWithProviders(<InspirationModal character={{ id: 3, inspiration: 0 }} onClose={vi.fn()} onError={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Отнять' })).toBeDisabled()
  })
})
