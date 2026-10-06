import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Layout from '@/components/layout/Layout.jsx'
import { renderWithProviders } from '../../helpers/render.jsx'

vi.mock('@/features/auth/useAuth.js', () => ({
  useAuth: () => ({ authenticated: false, isGM: false, logout: vi.fn() }),
}))

describe('Layout navigation', () => {
  it('keeps focus in the mobile menu and restores scrolling when dismissed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout />, { auth: false })
    const trigger = screen.getByRole('button', { name: 'Открыть меню' })
    await user.click(trigger)
    const menu = within(screen.getByRole('dialog', { name: 'Меню навигации' }))
    expect(menu.getByRole('button', { name: 'Закрыть меню' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    menu.getByRole('link', { name: 'Особенности' }).focus()
    await user.tab()
    expect(menu.getByRole('link', { name: /Heofberu/ })).toHaveFocus()
    await user.tab({ shift: true })
    expect(menu.getByRole('link', { name: 'Особенности' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('opens catalog links from the keyboard and restores focus on Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout />, { auth: false })
    const trigger = screen.getByRole('button', { name: 'Справочники' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await user.tab()
    expect(screen.getByRole('link', { name: 'Расы' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Расы' })).not.toBeInTheDocument()
  })

  it('keeps the catalog category active on a record page and closes after navigation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Layout />, { auth: false, routerProps: { initialEntries: ['/catalog/races/2'] } })
    const trigger = screen.getByRole('button', { name: 'Справочники' })
    await user.click(trigger)
    expect(screen.getByRole('link', { name: 'Расы' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('link', { name: 'Классы' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
