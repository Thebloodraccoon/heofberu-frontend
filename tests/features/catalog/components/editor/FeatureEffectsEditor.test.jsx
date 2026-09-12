import { useState } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { catalogApi } from '@/features/catalog/api.js'
import FeatureEffectsEditor from '@/features/catalog/components/editor/FeatureEffectsEditor.jsx'

vi.mock('@/features/catalog/api.js', async () => {
  const actual = await vi.importActual('@/features/catalog/api.js')
  const mockify = (value) => {
    if (typeof value === 'function') return vi.fn()
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, mockify(v)]))
    }
    return value
  }
  return { catalogApi: mockify(actual.catalogApi) }
})

// Редактор управляемый: харнесс держит value в стейте, как это делают формы.
function Harness({ initial = {} }) {
  const [tree, setTree] = useState(initial)
  return <FeatureEffectsEditor value={tree} onChange={setTree} />
}

const renderEditor = (initial) => renderWithProviders(<Harness initial={initial} />)

describe('FeatureEffectsEditor', () => {
  beforeEach(() => {
    catalogApi.skills.list.mockResolvedValue({
      items: [{ id: 5, key: 'stealth', name: 'Скрытность' }],
    })
  })

  it('renders all six fixed sections plus choice groups', async () => {
    renderEditor()
    expect(screen.getByText('Изменение характеристик')).toBeInTheDocument()
    expect(screen.getByText('Владение навыками')).toBeInTheDocument()
    expect(screen.getByText('Проверки спасброска')).toBeInTheDocument()
    expect(screen.getByText('Владение доспехами')).toBeInTheDocument()
    expect(screen.getByText('Владение оружием')).toBeInTheDocument()
    expect(screen.getByText('Заклинания')).toBeInTheDocument()
    expect(screen.getByText('Группы выбора')).toBeInTheDocument()
  })

  it('adds an ability row', async () => {
    const user = userEvent.setup()
    renderEditor()
    expect(screen.getByText('Увеличений нет')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Увеличение' }))

    expect(await screen.findByRole('button', { name: 'Сила' })).toBeInTheDocument()
  })

  it('disables abilities already used by another row of the same list', async () => {
    const user = userEvent.setup()
    renderEditor({ ability_effects: [{ ability: 'STR', amount: 2, new_cap: null }] })

    await user.click(screen.getByRole('button', { name: '+ Увеличение' }))

    const strOption = await screen.findByRole('button', { name: /^Сила/ })
    expect(strOption.disabled).toBe(true)
  })

  it('adds a choice group with an option and sets labels', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: '+ Добавить группу' }))
    await user.click(await screen.findByRole('button', { name: '+ Добавить вариант' }))

    const groupInput = await screen.findByPlaceholderText('Название группы, например «Выберите навык»')
    await user.type(groupInput, 'Выберите навык')
    const optionInput = screen.getByPlaceholderText('Название варианта, например «Скрытность»')
    await user.type(optionInput, 'Скрытность')

    await waitFor(() => {
      expect(screen.getByDisplayValue('Выберите навык')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Скрытность')).toBeInTheDocument()
    })
  })

  it('clears a list via the Очистить action', async () => {
    const user = userEvent.setup()
    renderEditor({ saving_throw_effects: [{ ability: 'WIS' }] })
    expect(screen.getByText('Мудрость')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Очистить' }))

    await waitFor(() => {
      expect(screen.getByText('Спасбросков нет')).toBeInTheDocument()
    })
  })
})