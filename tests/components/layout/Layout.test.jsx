import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Layout from '@/components/layout/Layout.jsx'
import { renderWithProviders } from '../../helpers/render.jsx'

const auth = vi.hoisted(() => ({ authenticated: false, isGM: false, isFounder: false }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ ...auth, logout: vi.fn() }) }))

describe('Layout navigation', () => {
  beforeEach(() => Object.assign(auth, { authenticated: false, isGM: false, isFounder: false }))
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
    expect(trigger).toHaveClass('bg-stone-800', 'text-stone-100')
    expect(trigger).toHaveAttribute('aria-current', 'true')
    await user.click(trigger)
    expect(screen.getByRole('link', { name: 'Расы' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('link', { name: 'Классы' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveClass('bg-stone-800', 'text-stone-100')
    await user.click(screen.getByRole('link', { name: 'Лор', exact: true }))
    expect(trigger).not.toHaveClass('bg-stone-800')
    expect(trigger).not.toHaveAttribute('aria-current')
  })

  it.each([
    ['/profile', 'Личное'],
    ['/characters/42', 'Личное'],
    ['/campaigns/1?tab=sessions', 'Личное'],
    ['/gm/articles?id=1', 'Для ГМ'],
    ['/gm/editor/races/2', 'Для ГМ'],
    ['/users/42', 'Админ'],
  ])('highlights the parent dropdown for %s', (path, name) => {
    Object.assign(auth, { authenticated: true, isGM: true, isFounder: true })
    renderWithProviders(<Layout />, { auth: false, routerProps: { initialEntries: [path] } })
    const trigger = screen.getByRole('button', { name, exact: true })
    expect(trigger).toHaveClass('bg-stone-800', 'text-stone-100')
    expect(trigger).toHaveAttribute('aria-current', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not treat a similar path prefix as a selected dropdown item', () => {
    renderWithProviders(<Layout />, { auth: false, routerProps: { initialEntries: ['/catalog/races-extra'] } })
    expect(screen.getByRole('button', { name: 'Справочники' })).not.toHaveAttribute('aria-current')
  })
})
