import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import CharacterDetailPage from '@/features/characters/pages/CharacterDetailPage.jsx'
import AttacksPanel from '@/features/characters/components/sheet/AttacksPanel.jsx'
import { loadRollHistory } from '@/lib/rollHistory.js'

const fixture = vi.hoisted(() => ({
  character: { id: 12, name: 'Элиан Ворон', owner_id: 1, class_id: 2, race_id: 3, level: 5, strength: 12, dexterity: 16, constitution: 14, intelligence: 10, wisdom: 14, charisma: 10, current_hp: 32, max_hp: 42, temp_hp: 5, armor_class: 14, shield: 2, speed: 30, inspiration: 1 },
  skills: [{ id: 1, name: 'stealth', ability: 'DEX' }, { id: 2, name: 'perception', ability: 'WIS' }],
  attacks: [{ id: 1, name: 'Длинный лук', attack_type: 'RANGED_ATTACK', ability: 'DEX', is_proficient: true, bonus_damage: 3, damage_dice_count: 1, damage_dice_type: 'D8', damage_type: 'PIERCING', notes: 'Из тиса', range: '150 футов' }],
  update: vi.fn(), hp: vi.fn(), rest: vi.fn(), addAttack: vi.fn(), refetch: vi.fn(), removeAttack: vi.fn(), refetchCombat: vi.fn(),
}))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 1, username: 'Daniel' } }) }))
vi.mock('@/features/users/queries.js', () => ({ useUsers: () => ({ data: [] }) }))
vi.mock('@/features/characters/queries.js', async (importOriginal) => ({
  ...await importOriginal(),
  useCharacter: () => ({ data: fixture.character, refetch: fixture.refetch }),
  useCharacterAttacks: () => ({ data: fixture.attacks }),
  useCanLevelUp: () => ({ data: { can_level_up: false } }),
  useCharacterPendingChoices: () => ({ data: [] }),
  useCharacterPendingChoicesCount: () => ({ data: 0 }),
  useCharacterProficiencies: () => ({ data: { skills: [{ skill_id: 1, is_expertise: true }, { skill_id: 2 }], saving_throws: [{ ability: 'DEX' }], armor: ['LIGHT'], weapons: ['SIMPLE'] } }),
  useCharacterSpells: () => ({ data: [] }),
  useCharacterSpellSlots: () => ({ data: [] }),
  useCharacterGrantedSpells: () => ({ data: [] }),
  useCharacterFeats: () => ({ data: [] }),
  useCharacterFeatures: () => ({ data: [] }),
  useCharacterItems: () => ({ data: [] }),
  useCharacterConditions: () => ({ data: [] }),
  useBackstory: () => ({ data: '' }),
  useCharacterStats: () => ({ data: {} }),
  useCharacterCombatStats: () => ({
    data: {
      armor_class: { manual: 14, shield_manual: 2, computed: 15, breakdown: [{ source: 'armor', label: 'Кожаный доспех', value: 11 }, { source: 'ability', label: 'Ловкость', value: 3 }, { source: 'bonus', label: 'Кольцо защиты', value: 1 }] },
      speed: { manual: 30, computed: { walk: 35, fly: null, swim: 40, climb: null, burrow: null }, breakdown: [{ source: 'base', label: 'Скорость расы', value: 30, speed_type: 'WALK' }] },
    },
    refetch: fixture.refetchCombat,
  }),
  useCharacterAsiChoices: () => ({ data: [] }),
  useCharacterAnsweredChoices: () => ({ data: [] }),
}))
vi.mock('@/features/catalog/queries.js', async (importOriginal) => ({
  ...await importOriginal(),
  useClassDetail: () => ({ data: { name: 'Следопыт', spellcasting_ability: 'WIS' } }),
  useRaceDetail: () => ({ data: { name: 'Полуэльф' } }),
  useSubclassDetail: () => ({ data: null }),
  useSubraceDetail: () => ({ data: null }),
  useBackgroundDetail: () => ({ data: null }),
  useSubracesForRace: () => ({ data: [] }),
  useSubclassesForClass: () => ({ data: [] }),
  useSkills: () => ({ data: fixture.skills }),
  useFeats: () => ({ data: [] }),
  useSpells: () => ({ data: [] }),
}))
vi.mock('@/features/characters/api.js', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, charactersApi: { ...original.charactersApi, update: fixture.update, hp: fixture.hp, rest: fixture.rest, attacks: { ...original.charactersApi.attacks, add: fixture.addAttack, remove: fixture.removeAttack } } }
})

const setup = () => ({ ...renderWithProviders(<Routes><Route path="/characters/:id" element={<CharacterDetailPage />} /></Routes>, { auth: false, routerProps: { initialEntries: ['/characters/12'] } }), user: userEvent.setup() })
beforeEach(() => {
  fixture.update.mockResolvedValue({})
  fixture.hp.mockResolvedValue({})
  fixture.rest.mockResolvedValue({})
  fixture.addAttack.mockResolvedValue({})
  fixture.removeAttack.mockResolvedValue({})
  fixture.refetch.mockResolvedValue({ data: fixture.character })
})

describe('Character sheet', () => {
  it('shows computed AC and speed next to the manual ones and saves the manual speed', async () => {
    const { user } = setup()
    expect(screen.getAllByText('Щит: +2 · Расчёт: 15')[0]).toBeVisible()
    await user.click(screen.getAllByRole('button', { name: /^Скорость/ })[0])
    const swim = within(screen.getByRole('rowgroup', { name: 'Плавание' }))
    expect(swim.getByRole('rowheader', { name: 'Плавание' }).nextSibling).toHaveTextContent('40 фт')
    expect(within(screen.getByRole('rowgroup', { name: 'Ходьба' })).getByText('Скорость расы')).toBeVisible()
    const input = screen.getByLabelText(/Скорость ходьбы на листе/)
    await user.clear(input)
    await user.type(input, '35')
    await user.click(screen.getByRole('button', { name: 'Задать' }))
    expect(fixture.update).toHaveBeenCalledWith('12', { speed: 35 })
    // Ручная скорость и расчёт лежат в combat-stats — после сохранения он перечитывается.
    expect(fixture.refetchCombat).toHaveBeenCalled()
  })

  it('refetches combat stats after saving the manual AC', async () => {
    const { user } = setup()
    fixture.refetchCombat.mockClear()
    await user.click(screen.getAllByRole('button', { name: /^Класс доспеха/ })[0])
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(fixture.update).toHaveBeenCalledWith('12', { armor_class: 14, shield: 2 })
    expect(fixture.refetchCombat).toHaveBeenCalled()
  })

  it('records the natural die and calculation for initiative history', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    try {
      const { user } = setup()
      await user.click(screen.getByRole('button', { name: /^Инициатива/ }))
      expect(loadRollHistory()[0]).toMatchObject({ title: 'Инициатива', d20: 20, detail: '20 + 3', dice: 'к20 + 3', total: 23 })
    } finally {
      random.mockRestore()
    }
  })
  it('keeps identity links, skill bonuses and every section available', async () => {
    const { user } = setup()
    expect(screen.getByRole('heading', { name: 'Элиан Ворон' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Следопыт' })).toHaveAttribute('href', '/catalog/classes/2')
    expect(screen.getByRole('link', { name: 'Полуэльф' })).toHaveAttribute('href', '/catalog/races/3')
    expect(screen.getByRole('button', { name: 'Скрытность: +9, Экспертиза' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ловкость: спасбросок +6, владение' })).toBeVisible()
    const nav = screen.getByRole('navigation', { name: 'Разделы листа персонажа' })
    for (const name of ['Заклинания', 'Способности', 'Снаряжение', 'Состояния', 'Личность', 'Заметки', 'Развитие персонажа', 'Характеристики', 'Атаки']) {
      await user.click(within(nav).getByRole('button', { name, exact: true }))
      expect(screen.getByRole('region', { name, exact: true })).toBeInTheDocument()
      expect(within(nav).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('opens HP in a drawer, applies damage, and preserves rest and temporary HP actions', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /^Хиты/ }))
    let dialog = screen.getByRole('dialog', { name: 'Хиты и отдых' })
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Изменение хитов' }), '-4{Enter}')
    expect(fixture.hp).toHaveBeenCalledWith('12', { delta: -4 })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Хиты/ }))
    dialog = screen.getByRole('dialog', { name: 'Хиты и отдых' })
    await user.clear(within(dialog).getByRole('spinbutton', { name: 'Временные хиты' }))
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Временные хиты' }), '8')
    await user.click(within(within(dialog).getByRole('form', { name: 'Временные хиты' })).getByRole('button', { name: 'Применить' }))
    expect(fixture.hp).toHaveBeenCalledWith('12', { temp_hp: 8 })
    await user.click(screen.getByRole('button', { name: /^Хиты/ }))
    await user.click(screen.getByRole('button', { name: 'Короткий отдых' }))
    expect(fixture.rest).toHaveBeenCalledWith('12', { type: 'short' })
  })

  it('cancels armor changes with Escape, then saves from the drawer footer', async () => {
    const { user } = setup()
    const trigger = screen.getByRole('button', { name: /^Класс доспеха/ })
    await user.click(trigger)
    await user.clear(screen.getByRole('spinbutton', { name: 'Доспех' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Доспех' }), '18')
    await user.keyboard('{Escape}')
    expect(fixture.update).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    expect(screen.getByRole('spinbutton', { name: 'Доспех' })).toHaveValue(14)
    await user.clear(screen.getByRole('spinbutton', { name: 'Щит' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Щит' }), '3')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(fixture.update).toHaveBeenCalledWith('12', { armor_class: 14, shield: 3 })
  })

  it('submits a new attack using the external footer button and supports dice/history', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Добавить', exact: true }))
    const dialog = screen.getByRole('dialog', { name: 'Новая атака' })
    await user.type(within(dialog).getAllByRole('textbox')[0], 'Кинжал')
    await user.click(within(dialog).getByRole('button', { name: 'Добавить атаку' }))
    expect(fixture.addAttack).toHaveBeenCalledWith(12, expect.objectContaining({ name: 'Кинжал', ability: 'STR' }))
    await user.click(screen.getByRole('button', { name: 'Броски', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Выбрать к6', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Добавить к6', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Бросить', exact: true }))
    await user.click(screen.getByRole('button', { name: 'История бросков' }))
    expect(within(screen.getByRole('dialog', { name: 'История бросков' })).getByRole('listitem')).toHaveTextContent('2к6')
    expect(loadRollHistory()[0]).toMatchObject({ dice: '2к6' })
  })

  it('preserves a draft name while opening and cancelling the subclass selection', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Настройки персонажа' }))
    await user.clear(screen.getByRole('textbox', { name: 'Имя' }))
    await user.type(screen.getByRole('textbox', { name: 'Имя' }), 'Новое имя')
    await user.click(screen.getByRole('button', { name: /Подкласс/ }))
    expect(screen.getByRole('dialog', { name: 'Выбор подкласса' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('textbox', { name: 'Имя' })).toHaveValue('Новое имя')
    expect(fixture.update).not.toHaveBeenCalled()
  })

  it('returns from the mobile abilities tab when the viewport becomes desktop sized', async () => {
    const original = window.matchMedia
    let onChange
    const media = { matches: false, addEventListener: vi.fn((name, callback) => { onChange = callback }), removeEventListener: vi.fn() }
    window.matchMedia = vi.fn(() => media)
    try {
      const { user } = setup()
      const nav = screen.getByRole('navigation', { name: 'Разделы листа персонажа' })
      await user.click(within(nav).getByRole('button', { name: 'Характеристики' }))
      media.matches = true
      act(() => onChange())
      expect(within(nav).getByRole('button', { name: 'Атаки' })).toHaveAttribute('aria-current', 'page')
    } finally { window.matchMedia = original }
  })
})

it('uses damage dice for the single responsive attack card and keeps notes/edit/delete', async () => {
  const onRoll = vi.fn()
  const onRollDamage = vi.fn()
  const user = userEvent.setup()
  renderWithProviders(<AttacksPanel characterId={12} attackBonus={() => 6} onRoll={onRoll} onRollDamage={onRollDamage} onError={vi.fn()} />, { auth: false })
  await user.click(screen.getByRole('button', { name: 'Урон 1к8 +3' }))
  expect(onRollDamage).toHaveBeenCalledWith('Урон: Длинный лук', 1, 8, 3)
  expect(onRoll).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Атака +6' }))
  expect(onRoll).toHaveBeenCalledWith('Атака: Длинный лук', 6)
  await user.click(screen.getByRole('button', { name: 'Показать заметку' }))
  expect(screen.getByText('Из тиса')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Изменить' }))
  expect(screen.getByRole('dialog', { name: 'Изменить атаку' })).toBeVisible()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Удалить' }))
  expect(fixture.removeAttack).toHaveBeenCalledWith(12, 1)
})
