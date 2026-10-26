import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import WeaponPropertyChips from '@/features/catalog/components/WeaponPropertyChips.jsx'

vi.mock('@/features/catalog/queries.js', () => ({
  useWeaponProperties: () => ({
    data: [
      { id: 1, name: 'Универсальное', description: 'Можно держать **двумя руками**.' },
      { id: 2, name: 'Лёгкое', description: 'Подходит для боя двумя оружиями.' },
    ],
  }),
}))

describe('WeaponPropertyChips', () => {
  it('renders one focusable chip per property, description (Markdown) on hover / focus / tap', async () => {
    renderWithProviders(<WeaponPropertyChips properties={[{ id: 1, name: 'Универсальное' }, { id: 2, name: 'Лёгкое' }]} />, { auth: false })
    const chip = screen.getByRole('button', { name: 'Универсальное' })
    expect(screen.getByRole('button', { name: 'Лёгкое' })).toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await userEvent.hover(chip)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Можно держать двумя руками.')
    expect(screen.getByRole('tooltip').querySelector('strong')).toHaveTextContent('двумя руками')
    await userEvent.unhover(chip)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await userEvent.tab()
    expect(chip).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('describes the chip by its tooltip (no aria-expanded); a second tap closes it on touch', () => {
    renderWithProviders(<WeaponPropertyChips properties={[{ id: 1, name: 'Универсальное' }]} />, { auth: false })
    const chip = screen.getByRole('button', { name: 'Универсальное' })
    const tap = () => {
      fireEvent.pointerDown(chip, { pointerType: 'touch' })
      fireEvent.mouseEnter(chip)
      fireEvent.focus(chip)
      fireEvent.click(chip)
    }

    tap()
    expect(chip).not.toHaveAttribute('aria-expanded')
    expect(chip).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id)
    tap()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    tap()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })
})
