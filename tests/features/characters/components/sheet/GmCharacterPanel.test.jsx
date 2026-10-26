import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { byText } from '@tests/helpers/byText.js'
import { charactersApi } from '@/features/characters/api.js'
import { catalogApi } from '@/features/catalog/api.js'
import {
  useCharacterFeatures,
  useCharacterFeats,
  useCharacterItems,
  useCharacterProficiencies,
} from '@/features/characters/queries.js'
import { useCatalogPage, useFeatDetail, useFeatures } from '@/features/catalog/queries.js'

vi.mock('@/features/characters/api.js', () => ({
  charactersApi: {
    hp: vi.fn(),
    rest: vi.fn(),
    stats: { get: vi.fn() },
    gmPanel: {
      maxHp: vi.fn(),
      maxLevel: { get: vi.fn(), set: vi.fn() },
      asi: { add: vi.fn(), remove: vi.fn() },
      skills: { setExpertise: vi.fn() },
      feats: { add: vi.fn(), remove: vi.fn() },
      features: { add: vi.fn(), remove: vi.fn() },
      items: { add: vi.fn(), update: vi.fn(), remove: vi.fn() },
    },
    progression: { levelUp: vi.fn(), canLevelUp: vi.fn(), asiChoices: vi.fn().mockResolvedValue([]) },
    items: { add: vi.fn(), update: vi.fn(), remove: vi.fn() },
  },
}))

vi.mock('@/features/characters/queries.js', () => ({
  useCanLevelUp: vi.fn(() => ({ data: { can_level_up: false } })),
  useCharacterAsiAdjustments: vi.fn(() => ({ data: [] })),
  useCharacterAsiChoices: vi.fn(() => ({ data: [], isLoading: false })),
  useCharacterFeats: vi.fn(() => ({ data: [] })),
  useCharacterFeatures: vi.fn(() => ({ data: [] })),
  useCharacterStats: vi.fn(() => ({ data: null })),
  useCharacterItems: vi.fn(() => ({ data: [] })),
  useCharacterMaxLevel: vi.fn(() => ({ data: {} })),
  useCharacterProficiencies: vi.fn(() => ({ data: { armor: [] } })),
  useCharacterGmSpells: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/features/catalog/queries.js', () => ({
  useFeats: vi.fn(() => ({ data: [] })),
  useFeatures: vi.fn(() => ({ data: [] })),
  useFeatDetail: vi.fn(() => ({ data: null, isFetching: false })),
  useSkills: vi.fn(() => ({ data: [] })),
  useCatalogPage: vi.fn(() => ({ data: { items: [], total: 0 }, error: null, refetch: vi.fn() })),
}))

vi.mock('@/features/characters/components/wizard/AsiChoiceModal.jsx', () => ({ default: () => null }))
vi.mock('@/features/catalog/components/browse/FilterModal.jsx', () => ({ default: () => null }))
vi.mock('@/components/ui/Pagination.jsx', () => ({ default: () => null }))
vi.mock('@/features/catalog/components/browse/detail/ItemInfoModal.jsx', () => ({ default: () => null }))

const character = {
  id: 7,
  name: 'Тест',
  level: 3,
  current_hp: 20,
  max_hp: 30,
  temp_hp: 0,
  hit_dice: '3d8',
  class_id: 1,
  race_id: 1,
  subrace_id: null,
  skill_proficiencies: [],
}

const OTHER_FEATURE = {
  id: 5,
  name: 'Печать древней клятвы',
  description: 'Особая печать из редкости.',
  level: null,
}

const GRANTED_FEATURE = {
  id: 10,
  feature_id: 5,
  notes: 'Старая заметка',
  feature: { id: 5, name: 'Печать древней клятвы', description: 'Особая печать.', source_type: 'OTHER' },
}

const renderPanel = (tab = 'Умения') => {
  const result = renderWithProviders(
    <GmCharacterPanel character={character} onError={vi.fn()} reload={vi.fn().mockResolvedValue()} />,
  )
  fireEvent.click(screen.getByRole('tab', { name: tab }))
  return result
}

const SECTION_TITLES = [
  'Уровень персонажа',
  'Хиты и отдых',
  'Характеристики',
  'Навыки и экспертиза',
  'Черты',
  'Особенности',
  'Снаряжение персонажа',
]

// Пикер черт листает каталог сам (CatalogSearchList → catalogApi.feats.list).
const mockFeats = (items) => vi.spyOn(catalogApi.feats, 'list').mockResolvedValue({ items, total: items.length, page: 1, size: 30 })

beforeEach(() => {
  vi.clearAllMocks()
  useCharacterFeats.mockReturnValue({ data: [] })
  useCharacterFeatures.mockReturnValue({ data: [] })
  useCharacterItems.mockReturnValue({ data: [] })
  useFeatures.mockReturnValue({ data: [] })
  mockFeats([])
  useFeatDetail.mockReturnValue({ data: null, isFetching: false })
  useCharacterProficiencies.mockReturnValue({ data: { armor: [] } })
})

// Варианты увеличения характеристик черты — как их отдаёт бэк: эффекты «ability» в вариантах choice_groups.
const asiGroups = (increases) => ({
  choice_groups: increases.length
    ? [{ id: 1, pick_count: 1, options: increases.map((item, n) => ({ id: 100 + n, effects: [{ effect_type: 'ability', items: [item] }] })) }]
    : [],
})

describe('GmCharacterPanel unified grid', () => {
  it('requires selection and an ability option in the feat grant drawer', async () => {
    const feat = { id: 77, name: 'Дар силы', ...asiGroups([{ id: 71, ability: 'STR', amount: 1 }, { id: 72, ability: 'DEX', amount: 1 }]) }
    const listSpy = vi.spyOn(catalogApi.feats, 'list').mockResolvedValue({ items: [feat], total: 1 })
    useFeatDetail.mockReturnValue({ data: feat, isFetching: false })
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Выдать черту' }))
    const drawer = screen.getByRole('dialog', { name: 'Выдать черту' })
    const confirm = within(drawer).getByRole('button', { name: 'Выдать черту' })
    expect(confirm).toBeDisabled()
    await user.click(await within(drawer).findByRole('button', { name: 'Дар силы' }))
    expect(confirm).toBeDisabled()
    expect(charactersApi.gmPanel.feats.add).not.toHaveBeenCalled()
    await user.click(within(drawer).getAllByRole('radio')[0])
    await user.click(confirm)
    expect(charactersApi.gmPanel.feats.add).toHaveBeenCalledWith(7, { feat_id: 77, ability_score_increase_id: 71 })
    listSpy.mockRestore()
  })

  it('confirms an explicitly selected feature in the grant drawer', async () => {
    const listSpy = vi.spyOn(catalogApi.features, 'list').mockResolvedValue({ items: [OTHER_FEATURE], total: 1 })
    const user = userEvent.setup()
    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Выдать особенность' }))
    const drawer = screen.getByRole('dialog', { name: 'Выдать особенность' })
    const confirm = within(drawer).getByRole('button', { name: 'Выдать особенность' })
    expect(confirm).toBeDisabled()
    await user.click(await within(drawer).findByRole('button', { name: OTHER_FEATURE.name }))
    expect(charactersApi.gmPanel.features.add).not.toHaveBeenCalled()
    await user.click(confirm)
    expect(charactersApi.gmPanel.features.add).toHaveBeenCalledWith(7, { feature_id: 5 })
    listSpy.mockRestore()
  })
  it('groups editor sections into tabs and preserves drafts on switching', () => {
    renderPanel('Основное')
    for (const title of SECTION_TITLES) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('tablist')).toBeVisible()
    expect(screen.getByRole('tabpanel', { name: 'Основное' })).toBeVisible()
    const delta = screen.getByPlaceholderText('Введите число')
    fireEvent.change(delta, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Характеристики' }))
    expect(screen.getByRole('tabpanel', { name: 'Характеристики' })).toBeVisible()
    expect(screen.queryByPlaceholderText('Введите число')).not.toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Основное' }))
    expect(screen.getByPlaceholderText('Введите число')).toHaveValue(5)
  })
})

describe('GmCharacterPanel feature management', () => {
  it('lists only OTHER features and hides class/race granted ones', async () => {
    useCharacterFeatures.mockReturnValue({
      data: [
        GRANTED_FEATURE,
        { id: 11, feature_id: 9, notes: null, feature: { id: 9, name: 'Файт-стиль', source_type: 'CLASS' } },
      ],
    })
    const user = userEvent.setup()
    renderPanel()
    expect(screen.getByText('Печать древней клятвы')).toBeInTheDocument()
    expect(screen.getByText('Особая')).toBeInTheDocument()
    expect(screen.queryByText(byText('Заметка: Старая заметка'))).not.toBeInTheDocument()
    await user.click(screen.getByText('Печать древней клятвы'))
    expect(screen.getByText(byText('Заметка: Старая заметка'))).toBeInTheDocument()
    expect(screen.queryByText('Файт-стиль')).not.toBeInTheDocument()
  })

  it('records an OTHER feature from the picker', async () => {
    useFeatures.mockReturnValue({ data: [OTHER_FEATURE] })
    const user = userEvent.setup()
    renderPanel()

    const featuresCard = screen.getByText('Особенности').closest('section')
    await user.click(within(featuresCard).getByRole('button', { name: 'Добавить' }))
    expect(useFeatures).toHaveBeenCalledWith({ size: 100, source_type: 'OTHER' })

    await user.click(screen.getByRole('button', { name: 'Печать древней клятвы' }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.features.add).toHaveBeenCalledWith(7, { feature_id: 5 })
    })
  })

  it('removes a feature grant via DELETE after confirmation', async () => {
    useCharacterFeatures.mockReturnValue({ data: [GRANTED_FEATURE] })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Убрать' }))
    await user.click(screen.getByRole('button', { name: 'Да, удалить' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.features.remove).toHaveBeenCalledWith(7, 10)
    })
  })
})

describe('GmCharacterPanel feat granting', () => {
  const featsCard = () => screen.getByText('Черты').closest('section')

  const openFeatPicker = async (user) => {
    await user.click(within(featsCard()).getByRole('button', { name: 'Добавить' }))
  }

  it('forces a feat choice: confirm disabled until a row is selected', async () => {
    mockFeats([{ id: 3, name: 'Цепкий', description: 'Хватка железная.', min_level: null }])
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Цепкий' }))
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Выдать черту' }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.feats.add).toHaveBeenCalledWith(7, {
        feat_id: 3,
        ability_score_increase_id: null,
      })
    })
  })

  it('forces choosing the ability score increase when several options exist', async () => {
    mockFeats([
        {
          id: 4,
          name: 'Сильный удар',
          min_level: null,
          ...asiGroups([
            { id: 10, ability: 'STR', amount: 1 },
            { id: 11, ability: 'CON', amount: 1 },
          ]),
        },
      ])
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    await user.click(screen.getByRole('button', { name: 'Сильный удар' }))
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: '+1 к Телосложение' }))
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Выдать черту' }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.feats.add).toHaveBeenCalledWith(7, {
        feat_id: 4,
        ability_score_increase_id: 11,
      })
    })
  })

  it('passes the single ability score increase option explicitly without asking', async () => {
    mockFeats([
        {
          id: 5,
          name: 'Точный бросок',
          min_level: null,
          ...asiGroups([{ id: 20, ability: 'DEX', amount: 1 }]),
        },
      ])
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    await user.click(screen.getByRole('button', { name: 'Точный бросок' }))
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Выдать черту' }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.feats.add).toHaveBeenCalledWith(7, {
        feat_id: 5,
        ability_score_increase_id: 20,
      })
    })
  })

  it('does not offer feats already granted to the character', async () => {
    useCharacterFeats.mockReturnValue({ data: [{ id: 1, feat_id: 1, feat: { id: 1, name: 'Проворный' } }] })
    mockFeats([
        { id: 1, name: 'Проворный', min_level: null },
        { id: 2, name: 'Могучий', prerequisite_ability: 'STR', prerequisite_minimum_score: 13, min_level: null },
      ])
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    expect(screen.queryByRole('button', { name: 'Проворный' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Могучий' })).toBeDisabled()
  })

  it('lets the GM choose an option right from the expanded view', async () => {
    mockFeats([
        {
          id: 6,
          name: 'Крепкая хватка',
          min_level: null,
          ...asiGroups([
            { id: 30, ability: 'STR', amount: 1 },
            { id: 31, ability: 'WIS', amount: 1 },
          ]),
        },
      ])
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    await user.click(screen.getByRole('button', { name: 'Посмотреть: Крепкая хватка' }))
    await user.click(screen.getByRole('radio', { name: '+1 к Мудрость' }))
    expect(screen.getByRole('button', { name: 'Выдать черту' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Выдать черту' }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.feats.add).toHaveBeenCalledWith(7, {
        feat_id: 6,
        ability_score_increase_id: 31,
      })
    })
  })

  it('lets the GM view feat details before picking', async () => {
    mockFeats([{ id: 1, name: 'Проворный', min_level: null, description: '' }])
    useFeatDetail.mockReturnValue({
      data: { id: 1, name: 'Проворный', description: 'Быстрее всех.', ...asiGroups([]) },
      isFetching: false,
    })
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    await user.click(screen.getByRole('button', { name: 'Посмотреть: Проворный' }))
    expect(useFeatDetail).toHaveBeenLastCalledWith(1)
    expect(await screen.findByText('Быстрее всех.')).toBeInTheDocument()
  })
})

describe('GmCharacterPanel armor proficiencies', () => {
  it('lists and removes only category rows, not concrete armor items', () => {
    useCharacterProficiencies.mockReturnValue({
      data: {
        armor: [
          { armor_type: 'LIGHT', item_id: null, sources: [{ source_type: 'GM' }] },
          { armor_type: null, item_id: 9, sources: [{ source_type: 'GM' }] },
        ],
      },
    })
    renderPanel('Характеристики')
    expect(screen.getAllByTitle('Убрать владение')).toHaveLength(1)
    expect(screen.getByText('Лёгкие доспехи')).toBeInTheDocument()
  })
})

describe('GmCharacterPanel item stacks', () => {
  const STACK = {
    id: 1,
    item_id: 23,
    item: { id: 23, name: 'Меч' },
    quantity: 1,
    is_equipped: false,
    is_attuned: false,
    notes: '',
  }

  it('creates a brand-new stack via gm-panel POST even when the item is already owned', async () => {
    useCharacterItems.mockReturnValue({ data: [STACK] })
    useCatalogPage.mockReturnValue({
      data: { items: [{ id: 23, name: 'Меч' }], total: 1 },
      error: null,
      refetch: vi.fn(),
    })
    const user = userEvent.setup()
    renderPanel('Снаряжение')

    await user.click(within(document.getElementById('gm-item-picker-list')).getByRole('button', { name: /Меч/i }))
    const grantModal = screen.getByRole('heading', { name: 'Выдать предмет' }).closest('.bg-stone-900')
    await user.click(within(grantModal).getByRole('button', { name: 'Выдать' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.items.add).toHaveBeenCalledWith(7, { item_id: 23, quantity: 1 })
    })
    expect(charactersApi.gmPanel.items.update).not.toHaveBeenCalled()
  })

  it('updates a stack via gm-panel PATCH pointing at the stack id', async () => {
    useCharacterItems.mockReturnValue({ data: [STACK] })
    const user = userEvent.setup()
    renderPanel('Снаряжение')

    await user.click(screen.getByRole('button', { name: /Изменить/i }))
    await user.clear(screen.getByLabelText('Количество'))
    await user.type(screen.getByLabelText('Количество'), '5')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.items.update).toHaveBeenCalledWith(7, 1, {
        quantity: 5,
        is_equipped: false,
        is_attuned: false,
        notes: '',
      })
    })
  })

  it('toggles equip via PATCH and offers attunement only for items that need it', async () => {
    useCharacterItems.mockReturnValue({
      data: [STACK, { ...STACK, id: 2, item_id: 24, item: { id: 24, name: 'Кольцо защиты', requires_attunement: true } }],
    })
    const user = userEvent.setup()
    renderPanel('Снаряжение')

    expect(screen.getAllByRole('button', { name: /Экип/ })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /Настр/ })).toHaveLength(1)
    await user.click(screen.getAllByRole('button', { name: /Экип/ })[0])
    await user.click(screen.getByRole('button', { name: /Настр/ }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.items.update).toHaveBeenCalledWith(7, 1, { is_equipped: true })
      expect(charactersApi.gmPanel.items.update).toHaveBeenCalledWith(7, 2, { is_attuned: true })
    })
  })

  it('removes a stack via gm-panel DELETE pointing at the stack id', async () => {
    useCharacterItems.mockReturnValue({ data: [STACK] })
    const user = userEvent.setup()
    renderPanel('Снаряжение')

    await user.click(screen.getByRole('button', { name: /Убрать/i }))
    await user.click(screen.getByRole('button', { name: 'Да, удалить' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.items.remove).toHaveBeenCalledWith(7, 1)
    })
  })
})
