import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EquipmentPanel from '@/features/characters/components/sheet/EquipmentPanel.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { useCharacterItems, useSetItemEquipped } from '@/features/characters/queries.js'

const mutate = vi.fn()

vi.mock('@/features/characters/queries.js', () => ({
  useCharacterItems: vi.fn(),
  useSetItemEquipped: vi.fn(),
}))

const stack = (id, item, extra = {}) => ({ id, item_id: item.id, quantity: 1, is_equipped: false, item, ...extra })

beforeEach(() => {
  vi.clearAllMocks()
  useSetItemEquipped.mockReturnValue({ mutate, isPending: false })
})

describe('EquipmentPanel equip toggle', () => {
  const items = [
    stack(1, { id: 10, name: 'Кольчуга', kind: 'ARMOR', armor: { armor_category: 'HEAVY', armor_class_base: 16 } }),
    stack(2, { id: 11, name: 'Щит', kind: 'ARMOR', armor: { armor_category: 'SHIELD', armor_class_base: 2 } }, { is_equipped: true }),
    stack(3, { id: 12, name: 'Кольцо скорости', kind: 'GEAR', subtype: 'RING' }),
  ]

  it('lets armor, shields and worn gear be put on, with a stable name and aria-pressed, and sends the flipped flag', async () => {
    useCharacterItems.mockReturnValue({ data: items, isLoading: false })
    renderWithProviders(<EquipmentPanel character={{ id: 7 }} onError={vi.fn()} />)

    const toggles = screen.getAllByRole('button', { name: 'Надето' })
    expect(toggles.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(toggles[0]).toHaveTextContent('Не надето')

    await userEvent.click(toggles[2])

    expect(mutate).toHaveBeenCalledWith({ stackId: 3, isEquipped: true }, expect.objectContaining({ onError: expect.any(Function) }))
  })

  it('disables only the row being toggled', () => {
    useCharacterItems.mockReturnValue({ data: items, isLoading: false })
    useSetItemEquipped.mockReturnValue({ mutate, isPending: true, variables: { stackId: 2, isEquipped: false } })
    renderWithProviders(<EquipmentPanel character={{ id: 7 }} onError={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: 'Надето' }).map((b) => b.disabled)).toEqual([false, true, false])
  })

  it('has no toggle on weapons, tools and gear that is not worn, unless it is already on', () => {
    useCharacterItems.mockReturnValue({
      data: [
        stack(4, { id: 20, name: 'Кинжал', kind: 'WEAPON' }),
        stack(5, { id: 21, name: 'Воровские инструменты', kind: 'TOOL' }),
        stack(6, { id: 22, name: 'Зелье лечения', kind: 'GEAR', subtype: 'POTION' }),
        stack(7, { id: 23, name: 'Длинный меч', kind: 'WEAPON' }, { is_equipped: true }),
      ],
      isLoading: false,
    })
    renderWithProviders(<EquipmentPanel character={{ id: 7 }} onError={vi.fn()} />)

    // только уже надетый меч — его можно снять
    expect(screen.getAllByRole('button', { name: 'Надето' }).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true'])
  })
})
