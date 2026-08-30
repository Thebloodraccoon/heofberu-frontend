import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { charactersApi } from '@/features/characters/api.js'
import {
  useCharacterFeatures,
  useCharacterFeats,
  useCharacterItems,
} from '@/features/characters/queries.js'
import { useAllFeats, useCatalogPage, useFeatDetail, useFeatures } from '@/features/catalog/queries.js'

vi.mock('@/features/characters/api.js', () => ({
  charactersApi: {
    hp: vi.fn(),
    rest: vi.fn(),
    gmPanel: {
      maxHp: vi.fn(),
      maxLevel: { get: vi.fn(), set: vi.fn() },
      asi: { add: vi.fn(), remove: vi.fn() },
      skills: { setExpertise: vi.fn() },
      feats: { add: vi.fn(), remove: vi.fn() },
      features: { add: vi.fn(), update: vi.fn(), remove: vi.fn() },
      items: { add: vi.fn(), update: vi.fn(), remove: vi.fn() },
    },
    progression: { levelUp: vi.fn(), canLevelUp: vi.fn(), asiChoices: vi.fn().mockResolvedValue([]) },
    items: { add: vi.fn(), update: vi.fn(), remove: vi.fn() },
  },
}))

vi.mock('@/features/characters/queries.js', () => ({
  useCanLevelUp: vi.fn(() => ({ data: { can_level_up: false } })),
  useCharacterAsiAdjustments: vi.fn(() => ({ data: [] })),
  useCharacterFeats: vi.fn(() => ({ data: [] })),
  useCharacterFeatures: vi.fn(() => ({ data: [] })),
  useCharacterGmStats: vi.fn(() => ({ data: null })),
  useCharacterItems: vi.fn(() => ({ data: [] })),
  useCharacterMaxLevel: vi.fn(() => ({ data: {} })),
}))

vi.mock('@/features/catalog/queries.js', () => ({
  useFeats: vi.fn(() => ({ data: [] })),
  useFeatures: vi.fn(() => ({ data: [] })),
  useAllFeats: vi.fn(() => ({ data: [], isFetching: false })),
  useFeatDetail: vi.fn(() => ({ data: null, isFetching: false })),
  useRaceDetail: vi.fn(() => ({ data: null })),
  useSubraceDetail: vi.fn(() => ({ data: null })),
  useSkills: vi.fn(() => ({ data: [] })),
  useCatalogPage: vi.fn(() => ({ data: { items: [], total: 0 }, error: null, refetch: vi.fn() })),
}))

vi.mock('@/features/characters/components/wizard/AsiChoiceModal.jsx', () => ({ default: () => null }))
vi.mock('@/features/catalog/components/browse/FilterModal.jsx', () => ({ default: () => null }))
vi.mock('@/features/catalog/components/browse/Pagination.jsx', () => ({ default: () => null }))
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

const renderPanel = () =>
  renderWithProviders(
    <GmCharacterPanel character={character} onError={vi.fn()} reload={vi.fn().mockResolvedValue()} />,
  )

const SECTION_TITLES = [
  'Уровень персонажа',
  'Хиты и отдых',
  'Характеристики',
  'Навыки и экспертиза',
  'Черты',
  'Особенности',
  'Снаряжение персонажа',
]

beforeEach(() => {
  vi.clearAllMocks()
  useCharacterFeats.mockReturnValue({ data: [] })
  useCharacterFeatures.mockReturnValue({ data: [] })
  useCharacterItems.mockReturnValue({ data: [] })
  useFeatures.mockReturnValue({ data: [] })
  useAllFeats.mockReturnValue({ data: [], isFetching: false })
  useFeatDetail.mockReturnValue({ data: null, isFetching: false })
})

describe('GmCharacterPanel unified grid', () => {
  it('shows every editor section at once without a tab bar', () => {
    renderPanel()
    for (const title of SECTION_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })
})

describe('GmCharacterPanel feature management', () => {
  it('lists only OTHER features and hides class/race granted ones', () => {
    useCharacterFeatures.mockReturnValue({
      data: [
        GRANTED_FEATURE,
        { id: 11, feature_id: 9, notes: null, feature: { id: 9, name: 'Файт-стиль', source_type: 'CLASS' } },
      ],
    })
    renderPanel()
    expect(screen.getByText('Печать древней клятвы')).toBeInTheDocument()
    expect(screen.getByText('Особая')).toBeInTheDocument()
    expect(screen.getByText('Заметка: Старая заметка')).toBeInTheDocument()
    expect(screen.queryByText('Файт-стиль')).not.toBeInTheDocument()
  })

  it('records an OTHER feature from the picker', async () => {
    useFeatures.mockReturnValue({ data: [OTHER_FEATURE] })
    const user = userEvent.setup()
    renderPanel()

    const featuresCard = screen.getByText('Особенности').closest('div')
    await user.click(within(featuresCard).getByRole('button', { name: 'Добавить...' }))
    expect(useFeatures).toHaveBeenCalledWith({ size: 100, source_type: 'OTHER' })

    await user.click(screen.getByRole('button', { name: /Печать древней клятвы/i }))
    await waitFor(() => {
      expect(charactersApi.gmPanel.features.add).toHaveBeenCalledWith(7, { feature_id: 5 })
    })
  })

  it('changes a feature grant notes via PATCH', async () => {
    useCharacterFeatures.mockReturnValue({ data: [GRANTED_FEATURE] })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Заметка' }))
    const textarea = screen.getByLabelText('Заметка для игрока')
    await user.clear(textarea)
    await user.type(textarea, 'Новая заметка')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.features.update).toHaveBeenCalledWith(7, 10, { notes: 'Новая заметка' })
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
  const featsCard = () => screen.getByText('Черты').closest('div')

  const openFeatPicker = async (user) => {
    await user.click(within(featsCard()).getByRole('button', { name: 'Добавить...' }))
  }

  it('forces a feat choice: confirm disabled until a row is selected', async () => {
    useAllFeats.mockReturnValue({
      data: [{ id: 3, name: 'Цепкий', description: 'Хватка железная.', min_level: null }],
      isFetching: false,
    })
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
    useAllFeats.mockReturnValue({
      data: [
        {
          id: 4,
          name: 'Сильный удар',
          min_level: null,
          ability_score_increases: [
            { id: 10, ability: 'STR', amount: 1 },
            { id: 11, ability: 'CON', amount: 1 },
          ],
        },
      ],
      isFetching: false,
    })
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
    useAllFeats.mockReturnValue({
      data: [
        {
          id: 5,
          name: 'Точный бросок',
          min_level: null,
          ability_score_increases: [{ id: 20, ability: 'DEX', amount: 1 }],
        },
      ],
      isFetching: false,
    })
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
    useAllFeats.mockReturnValue({
      data: [
        { id: 1, name: 'Проворный', min_level: null },
        { id: 2, name: 'Могучий', prerequisite_ability: 'STR', prerequisite_minimum_score: 13, min_level: null },
      ],
      isFetching: false,
    })
    const user = userEvent.setup()
    renderPanel()

    await openFeatPicker(user)
    expect(screen.queryByRole('button', { name: 'Проворный' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Могучий' })).toBeDisabled()
  })

  it('lets the GM choose an option right from the expanded view', async () => {
    useAllFeats.mockReturnValue({
      data: [
        {
          id: 6,
          name: 'Крепкая хватка',
          min_level: null,
          ability_score_increases: [
            { id: 30, ability: 'STR', amount: 1 },
            { id: 31, ability: 'WIS', amount: 1 },
          ],
        },
      ],
      isFetching: false,
    })
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
    useAllFeats.mockReturnValue({
      data: [{ id: 1, name: 'Проворный', min_level: null, description: '' }],
      isFetching: false,
    })
    useFeatDetail.mockReturnValue({
      data: { id: 1, name: 'Проворный', description: 'Быстрее всех.', ability_score_increases: [] },
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
    renderPanel()

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
    renderPanel()

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

  it('removes a stack via gm-panel DELETE pointing at the stack id', async () => {
    useCharacterItems.mockReturnValue({ data: [STACK] })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /Убрать/i }))
    await user.click(screen.getByRole('button', { name: 'Да, удалить' }))

    await waitFor(() => {
      expect(charactersApi.gmPanel.items.remove).toHaveBeenCalledWith(7, 1)
    })
  })
})