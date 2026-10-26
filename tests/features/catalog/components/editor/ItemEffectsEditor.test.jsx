import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import ItemEffectsEditor from '@/features/catalog/components/editor/ItemEffectsEditor.jsx'
import { catalogApi } from '@/features/catalog/api.js'

// Редакторы строк — заглушки: число строк КД и кнопка «убрать все».
vi.mock('@/features/catalog/components/editor/effectTypeEditors.jsx', () => ({
  ArmorClassEffectsEditor: ({ rows, onChange }) => (
    <div>
      <span>КД строк: {rows.length}</span>
      <button type="button" onClick={() => onChange([])}>Убрать КД</button>
    </div>
  ),
  SpeedEffectsEditor: () => null,
  invalidSpeedRow: () => false,
}))

const a = { id: 1, mode: 'BONUS', value: 1, abilities: [], allows_shield: true, condition: 'NONE', min_level: null }
const b = { id: 2, mode: 'BONUS', value: 2, abilities: [], allows_shield: true, condition: 'NONE', min_level: null }
const item = { id: 9, armor_class_effects: [a, b], speed_effects: [] }
const response = (rows) => ({ item_id: 9, effects: [], armor_class_effects: rows, speed_effects: [] })

beforeEach(() => {
  vi.restoreAllMocks()
  for (const name of ['get', 'add', 'remove']) vi.spyOn(catalogApi.items.effects, name)
})

describe('ItemEffectsEditor', () => {
  it('after a partial failure re-reads the server effects, so «Повторить» only sends what is left', async () => {
    const effects = catalogApi.items.effects
    effects.remove.mockResolvedValueOnce(response([b])).mockRejectedValueOnce(new Error('Сеть недоступна'))
    effects.get.mockResolvedValue(response([b]))
    const { queryClient } = renderWithProviders(<ItemEffectsEditor itemId={9} item={item} />, { auth: false })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await userEvent.click(screen.getByRole('button', { name: 'Убрать КД' }))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить эффекты' }))

    expect(await screen.findByText(/Сеть недоступна/)).toBeInTheDocument()
    expect(effects.get).toHaveBeenCalledWith(9)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'items'] })

    effects.remove.mockResolvedValueOnce(response([]))
    await userEvent.click(screen.getByRole('button', { name: /Повторить/ }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Сохранить эффекты' })).not.toBeInTheDocument())
    // Строка 1 уже удалена первым прогоном — повтор удаляет только вторую.
    expect(effects.remove.mock.calls).toEqual([
      [9, 'armor_class', 1],
      [9, 'armor_class', 2],
      [9, 'armor_class', 2],
    ])
    expect(effects.add).not.toHaveBeenCalled()
  })
})
