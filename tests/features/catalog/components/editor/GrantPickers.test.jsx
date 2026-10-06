import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import ItemPickerModal from '@/features/catalog/components/editor/ItemPickerModal.jsx'
import SpellPickerModal from '@/features/catalog/components/editor/SpellPickerModal.jsx'

vi.mock('@/features/catalog/api.js', () => ({ catalogApi: {
  items: { list: vi.fn().mockResolvedValue({ items: [{ id: 1, name: 'Меч' }], total: 1 }) },
  spells: { list: vi.fn().mockResolvedValue({ items: [{ id: 2, name: 'Искра', level: 0 }], total: 1 }) },
} }))
vi.mock('@/features/catalog/queries.js', () => ({ useItemDetail: () => ({ data: null }), useSpellDetail: () => ({ data: null }) }))

describe('GM grant drawers', () => {
  it('expands filters inside the drawer and preserves selection after applying', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ItemPickerModal drawer title="Выдать предмет" onPick={vi.fn()} onClose={vi.fn()} />, { auth: false })
    await user.click(await screen.findByRole('button', { name: 'Меч' }))
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const filters = screen.getByRole('region', { name: 'Фильтры' })
    const options = within(filters).getAllByRole('button', { pressed: false })
    await user.click(options[0])
    await user.click(within(filters).getByRole('button', { name: 'Применить' }))
    expect(screen.queryByRole('region', { name: 'Фильтры' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выдать предмет' })).toBeEnabled()
    expect(screen.getByLabelText('Применённые фильтры')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Фильтры/ }))
    await user.click(screen.getByRole('button', { name: /Фильтры/ }))
    expect(screen.queryByRole('region', { name: 'Фильтры' })).not.toBeInTheDocument()
  })

  it('waits for explicit confirmation and validates item quantity', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ItemPickerModal drawer title="Выдать предмет" onPick={onPick} onClose={onClose} />, { auth: false })
    expect(screen.getByRole('button', { name: 'Выдать предмет' })).toBeDisabled()
    await user.click(await screen.findByRole('button', { name: 'Меч' }))
    expect(onPick).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Меч/, pressed: true })).toHaveAttribute('aria-pressed', 'true')
    const quantity = screen.getByRole('spinbutton', { name: 'Количество' })
    await user.clear(quantity)
    await user.type(quantity, '0')
    expect(screen.getByRole('button', { name: 'Выдать предмет' })).toBeDisabled()
    await user.clear(quantity)
    await user.type(quantity, '3')
    await user.click(screen.getByRole('button', { name: 'Выдать предмет' }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 3)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('can cancel a selected spell without granting it', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<SpellPickerModal drawer onPick={onPick} onClose={onClose} />, { auth: false })
    await user.click(await screen.findByRole('button', { name: /Искра/, pressed: false }))
    expect(screen.getByRole('button', { name: 'Выдать заклинание' })).toBeEnabled()
    expect(onPick).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onPick).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps immediate selection in the existing catalog modal', async () => {
    const onPick = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<ItemPickerModal onPick={onPick} onClose={onClose} />, { auth: false })
    await user.click(await screen.findByRole('button', { name: 'Меч' }))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
