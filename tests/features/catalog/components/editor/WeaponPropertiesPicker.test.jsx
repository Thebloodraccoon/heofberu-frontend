import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import WeaponPropertiesPicker from '@/features/catalog/components/editor/WeaponPropertiesPicker.jsx'

const mutations = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn() }))

vi.mock('@/features/catalog/queries.js', () => ({
  useWeaponProperties: () => ({
    data: [
      { id: 1, name: 'Универсальное', requires_versatile_damage: true, description: 'Две руки — больше урона.' },
      { id: 2, name: 'Лёгкое', requires_versatile_damage: false, description: '' },
    ],
  }),
  useCreateWeaponProperty: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateWeaponProperty: () => ({ mutateAsync: mutations.update, isPending: false }),
  useDeleteWeaponProperty: () => ({ mutateAsync: mutations.remove, isPending: false }),
}))

const render = (props) =>
  renderWithProviders(<WeaponPropertiesPicker onChange={vi.fn()} onFormChange={vi.fn()} {...props} />, { auth: false })

describe('WeaponPropertiesPicker list and drawer', () => {
  it('lists chosen properties one per row with their description and a remove action', async () => {
    const onChange = vi.fn()
    render({ value: [1, 2], onChange })
    expect(screen.getByText('Две руки — больше урона.')).toBeInTheDocument()
    expect(screen.getByText('Описания нет')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Убрать: Лёгкое' }))
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('shows descriptions in the picker drawer; choosing still toggles', async () => {
    const onChange = vi.fn()
    render({ value: [], onChange })
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByText('Две руки — больше урона.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Универсальное', pressed: false }))
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('«Добавить»: Markdown editor for the description and card-style checkboxes', async () => {
    render({ value: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByRole('button', { name: 'Добавить свойство' })).toHaveClass('catalog-add-button')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить свойство' }))
    expect(await screen.findByLabelText('Описание свойства')).toBeInTheDocument()
    expect(screen.getByRole('toolbar', { name: 'Форматирование текста' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Требует дистанцию/ })).toHaveClass('accent-ember')
  })
})

describe('WeaponPropertiesPicker property editor', () => {
  it('«Редактор свойств» lists the dictionary; a property is saved and deleted there (unpicking it on the weapon)', async () => {
    const onChange = vi.fn()
    render({ value: [2], onChange })
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.queryByRole('button', { name: /Редактировать свойство/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть: Свойства оружия' }))
    await userEvent.click(screen.getByRole('button', { name: 'Редактор свойств' }))
    await userEvent.click(screen.getByRole('button', { name: 'Редактировать свойство: Лёгкое' }))
    expect(screen.getByLabelText('Название *')).toHaveValue('Лёгкое')
    await userEvent.type(screen.getByLabelText('Название *'), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(mutations.update).toHaveBeenCalledWith({ id: 2, body: expect.objectContaining({ name: 'Лёгкое!' }) })

    await userEvent.click(screen.getByRole('button', { name: 'Редактировать свойство: Лёгкое' }))
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    expect(mutations.remove).toHaveBeenCalledWith(2)
    expect(onChange).toHaveBeenCalledWith([])
  })
})

describe('WeaponPropertiesPicker two-handed damage', () => {
  it('is hidden without a versatile property', () => {
    render({ value: [2] })
    expect(screen.queryByText(/Урон двумя руками/)).not.toBeInTheDocument()
  })

  it('shows the dice for «Универсальное» and writes them into the form', async () => {
    const onFormChange = vi.fn()
    render({ value: [1], onFormChange, form: { versatile_dice_count: '', versatile_dice_type: '' } })
    expect(screen.getByText('Урон двумя руками — для свойства «Универсальное»')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: 'к10' }))
    expect(onFormChange).toHaveBeenCalledWith({ versatile_dice_count: '1', versatile_dice_type: 'D10' })
  })

  it('clears the dice when the versatile property is removed', async () => {
    const onChange = vi.fn()
    const onFormChange = vi.fn()
    render({ value: [1, 2], onChange, onFormChange, form: { versatile_dice_count: '1', versatile_dice_type: 'D10' } })
    await userEvent.click(screen.getByRole('button', { name: 'Убрать: Универсальное' }))
    expect(onChange).toHaveBeenCalledWith([2])
    expect(onFormChange).toHaveBeenCalledWith({ versatile_dice_count: '', versatile_dice_type: '' })
  })
})
