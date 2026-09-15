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
    catalogApi.spells.list.mockResolvedValue({
      items: [{ id: 9, name: 'Огненный шар' }],
    })
  })

  it('renders empty static effects and choice groups sections', async () => {
    renderEditor()
    expect(screen.getByText('Статичные эффекты')).toBeInTheDocument()
    expect(screen.getByText('Группы выбора')).toBeInTheDocument()
    expect(screen.getByText('Статичных эффектов нет — особенность применяется как есть.')).toBeInTheDocument()
    expect(screen.getByText('Групп выбора нет — особенность применяется автоматически.')).toBeInTheDocument()
  })

  it('lists an existing static effect as a collapsed accordion row with an inline count', async () => {
    renderEditor({ ability_effects: [{ ability: 'STR', amount: 2, new_cap: null }] })
    expect(screen.getByText(/Изменение характеристик/)).toBeInTheDocument()
    expect(screen.getByText('· 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
    // Значения строк не видны, пока аккордеон не раскрыт.
    expect(screen.queryByText('Сила +2')).not.toBeInTheDocument()
  })

  it('expands the accordion to a read-only preview of what is inside, without opening the modal', async () => {
    const user = userEvent.setup()
    renderEditor({
      ability_effects: [{ ability: 'STR', amount: 1 }],
      skill_effects: [{ skill_id: 5, grants_expertise: true }],
    })

    await user.click(screen.getByText(/Изменение характеристик/))
    expect(screen.getByText('Сила +1')).toBeInTheDocument()

    await user.click(screen.getByText(/Владение навыками/))
    expect(screen.getByText('Скрытность (экспертиза)')).toBeInTheDocument()
    // Модалка не открылась — просто раскрылся аккордеон.
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
  })

  it('adds a static ability effect through the modal', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: '+ Добавить статичный эффект' }))
    await user.click(await screen.findByRole('button', { name: 'Изменение характеристик' }))
    await user.click(await screen.findByRole('button', { name: '+ Увеличение' }))
    await user.click(await screen.findByRole('button', { name: 'Сила' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/Изменение характеристик/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('removes a static effect group via Удалить without opening the modal', async () => {
    const user = userEvent.setup()
    renderEditor({ saving_throw_effects: [{ ability: 'WIS' }] })
    expect(screen.getByText(/Проверки спасброска/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => {
      expect(screen.getByText('Статичных эффектов нет — особенность применяется как есть.')).toBeInTheDocument()
    })
  })

  it('adds a choice group with an option through the modal (options have no label)', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: '+ Добавить выбор эффектов' }))
    await user.click(await screen.findByRole('button', { name: 'Владение навыками' }))
    await user.click(await screen.findByRole('button', { name: '+ Добавить вариант' }))

    expect(screen.getByText('Вариант 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/Владение навыками · выбрать 1 из 1/)).toBeInTheDocument()
  })

  it('reopens an existing choice group pre-filled when editing (options have no label)', async () => {
    const user = userEvent.setup()
    renderEditor({
      choice_groups: [
        { effect_type: 'saving_throw_effects', pick_count: 1, options: [{ saving_throw_effects: [{ ability: 'DEX' }] }] },
      ],
    })

    expect(screen.getByText(/Проверки спасброска · выбрать 1 из 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Изменить' }))

    expect(await screen.findByText('Вариант 1')).toBeInTheDocument()
    // Значение группы (спасбросок ДЕХ) видно в форме варианта.
    expect(screen.getAllByText('Ловкость').length).toBeGreaterThan(0)
  })

  it('adds a spell effect through the search-and-browse picker modal', async () => {
    const user = userEvent.setup()
    renderEditor()

    await user.click(screen.getByRole('button', { name: '+ Добавить статичный эффект' }))
    await user.click(await screen.findByRole('button', { name: 'Заклинания' }))
    await user.click(await screen.findByRole('button', { name: '+ Заклинание' }))

    expect(await screen.findByPlaceholderText('Поиск заклинания…')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Огненный шар' }))

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText(/Заклинания/)).toBeInTheDocument()
  })
})
