import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { catalogApi } from '@/features/catalog/api.js'
import Drawer, { DrawerFooter } from '@/components/ui/Drawer.jsx'
import { SpellEffectsEditor, ToolEffectsEditor } from '@/features/catalog/components/editor/effectTypeEditors.jsx'
import EffectGroupModal from '@/features/catalog/components/editor/EffectGroupModal.jsx'
import EffectRowsPicker from '@/features/catalog/components/editor/EffectRowsPicker.jsx'
import { newOpenSpellEffect } from '@/lib/utils/spellFilter.js'

vi.mock('@/features/catalog/api.js', async () => {
  const actual = await vi.importActual('@/features/catalog/api.js')
  const mockify = (value) => {
    if (typeof value === 'function') return vi.fn().mockResolvedValue({ items: [], total: 0 })
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, mockify(v)]))
    return value
  }
  return { catalogApi: mockify(actual.catalogApi) }
})

const page = (from, count, total) => ({
  items: Array.from({ length: count }, (_, i) => ({ id: from + i, name: `Доспех ${from + i}`, kind: 'ARMOR' })),
  total,
})

beforeEach(() => {
  catalogApi.items.list.mockReset()
  catalogApi.items.list.mockResolvedValue(page(1, 2, 2))
})

describe('Drawer footer', () => {
  it('DrawerFooter of a nested screen lands in the pinned drawer footer, outside the scrolling body', async () => {
    renderWithProviders(<Drawer title="Панель" onClose={vi.fn()}><p>Тело</p><DrawerFooter><button>Сохранить</button></DrawerFooter></Drawer>, { auth: false })
    const save = await screen.findByRole('button', { name: 'Сохранить' })
    await waitFor(() => expect(save.closest('footer')).toHaveClass('ui-drawer-footer'))
    expect(save.closest('.ui-drawer-body')).toBeNull()
  })
})

describe('tool proficiency editor', () => {
  it('choice option: «Любой» / «Инструмент» chips; «Любой» + optional category, data as before', async () => {
    const onChange = vi.fn()
    const onOpenPicker = vi.fn()
    const { rerender } = renderWithProviders(<ToolEffectsEditor allowOpen rows={[]} onChange={onChange} onOpenPicker={onOpenPicker} />, { auth: false })
    const modes = within(screen.getByRole('group', { name: 'Какой инструмент' }))
    await userEvent.click(modes.getByRole('button', { name: 'Инструмент' }))
    expect(onChange).toHaveBeenLastCalledWith([])
    await userEvent.click(modes.getByRole('button', { name: 'Любой' }))
    expect(onChange).toHaveBeenLastCalledWith([{ tool_category: null, item_id: null }])

    rerender(<ToolEffectsEditor allowOpen rows={[{ tool_category: null, item_id: null }]} onChange={onChange} onOpenPicker={onOpenPicker} />)
    expect(screen.getByText('Любой инструмент')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Инструменты ремесленника' }))
    expect(onChange).toHaveBeenLastCalledWith([{ tool_category: 'ARTISAN', item_id: null }])
  })

  it('«Инструмент» opens the item screen; a fixed effect has no «Любой»', async () => {
    const onOpenPicker = vi.fn()
    renderWithProviders(<ToolEffectsEditor rows={[]} onChange={vi.fn()} onOpenPicker={onOpenPicker} />, { auth: false })
    expect(screen.queryByRole('group', { name: 'Какой инструмент' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Добавить инструмент' }))
    expect(onOpenPicker).toHaveBeenCalledWith('items')
  })
})

describe('specific item screen (armor / weapon / tool)', () => {
  it('has search with «Найти», kind filters in the narrow drawer and loads the next page on scroll', async () => {
    catalogApi.items.list.mockImplementation(({ page: n }) => Promise.resolve(n === 1 ? page(1, 30, 40) : page(31, 10, 40)))
    renderWithProviders(<EffectRowsPicker effectType="armor_effects" mode="items" rows={[]} onChange={vi.fn()} onClose={vi.fn()} />, { auth: false })
    expect(await screen.findByRole('button', { name: 'Доспех 1' })).toBeInTheDocument()
    expect(catalogApi.items.list).toHaveBeenCalledWith(expect.objectContaining({ kind: ['ARMOR'], page: 1 }))
    expect(screen.getByRole('button', { name: 'Найти' })).toBeInTheDocument()

    const list = screen.getByRole('button', { name: 'Доспех 1' }).closest('.grant-picker-list')
    Object.defineProperties(list, { scrollHeight: { value: 1000 }, clientHeight: { value: 400 }, scrollTop: { value: 560, writable: true } })
    fireEvent.scroll(list)
    expect(await screen.findByRole('button', { name: 'Доспех 40' })).toBeInTheDocument()
    expect(catalogApi.items.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))

    await userEvent.click(screen.getByRole('button', { name: /Фильтры/ }))
    const filters = screen.getByRole('dialog', { name: 'Фильтры' })
    expect(filters).toHaveClass('ui-drawer--filters')
    expect(within(filters).getByText('Категория доспеха')).toBeInTheDocument()
  })
})

describe('effect group drawer layout', () => {
  it('static: no «Статичный эффект»; the section is named next to its add button', () => {
    renderWithProviders(<EffectGroupModal drawer mode="static" effectType="speed_effects" initialRows={[]} onSave={vi.fn()} onClose={vi.fn()} />, { auth: false })
    const dialog = screen.getByRole('dialog', { name: 'Скорость' })
    expect(within(dialog).queryByText('Статичный эффект')).not.toBeInTheDocument()
    // шапка панели + название раздела рядом с «Добавить»
    expect(within(dialog).getAllByText('Скорость')).toHaveLength(2)
    expect(within(dialog).getByRole('button', { name: 'Добавить: Скорость' })).toHaveTextContent('Добавить')
  })

  it('choice: «Добавить» (вариант) sits on the «Выбрать N» row', () => {
    renderWithProviders(<EffectGroupModal drawer mode="choice" effectType="tool_effects" onSave={vi.fn()} onClose={vi.fn()} />, { auth: false })
    expect(screen.getByText('Группа выбора')).toBeInTheDocument()
    const row = screen.getByRole('textbox', { name: 'Сколько выбрать' }).closest('.num-stepper').parentElement.parentElement
    expect(within(row).getByRole('button', { name: 'Добавить вариант' })).toBeInTheDocument()
  })
})

describe('«Любое заклинание на выбор» settings', () => {
  it('opens a regular-width drawer with card checkboxes and a player-facing preview', async () => {
    const onChange = vi.fn()
    const row = newOpenSpellEffect()
    const { rerender } = renderWithProviders(<SpellEffectsEditor allowOpen rows={[row]} onChange={onChange} />, { auth: false })
    await userEvent.click(screen.getByRole('button', { name: 'Настройки' }))
    const drawer = screen.getByRole('dialog', { name: 'Любое заклинание на выбор' })
    expect(drawer).not.toHaveClass('ui-drawer--filters')
    expect(within(drawer).getByText('Любое заклинание на выбор', { selector: 'p' })).toBeInTheDocument()
    await userEvent.click(within(drawer).getByRole('checkbox', { name: 'Только ритуалы' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ ritual_only: true })])
    rerender(<SpellEffectsEditor allowOpen rows={[{ ...row, ritual_only: true }]} onChange={onChange} />)
    expect(within(screen.getByRole('dialog', { name: 'Любое заклинание на выбор' })).getByText('Любое заклинание на выбор (ритуал)')).toBeInTheDocument()
  })
})
