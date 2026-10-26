import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import LevelUpModal from '@/features/characters/components/sheet/LevelUpModal.jsx'

const fixture = vi.hoisted(() => ({ levelUp: vi.fn(), next: vi.fn(), pending: vi.fn(), grants: [] }))
vi.mock('@/features/characters/api.js', () => ({ charactersApi: { progression: { levelUp: fixture.levelUp, canLevelUp: fixture.next }, grants: { pending: fixture.pending } } }))
vi.mock('@/features/characters/queries.js', () => ({ useCharacterFeats: () => ({ data: [] }), useCharacterPendingChoices: () => ({ data: fixture.grants }) }))
vi.mock('@/features/catalog/api.js', () => ({ catalogApi: { feats: { list: async () => ({ items: [{ id: 7, name: 'Бдительный' }], total: 1 }) } } }))
vi.mock('@/features/catalog/queries.js', () => ({
  useClassDetail: () => ({ data: { hit_dice: 'D8' } }),
  useFeatDetail: (id) => ({ data: id ? { id: 7, name: 'Бдительный', description: 'Наблюдает за окружением.' } : null, isFetching: false }),
  useSkills: () => ({ data: [] }),
  useSpells: () => ({ data: [] }),
  useSpellsById: () => ({}),
  useClasses: () => ({ data: [] }),
}))

const character = { id: 12, class_id: 2, level: 2, ability_scores: { constitution_total: 14, strength_total: 12 } }
const setup = (props = {}) => {
  const onClose = vi.fn()
  const onError = vi.fn()
  renderWithProviders(<LevelUpModal character={character} onClose={onClose} onError={onError} {...props} />, { auth: false })
  return { user: userEvent.setup(), onClose, onError }
}

beforeEach(() => {
  fixture.levelUp.mockReset().mockResolvedValue({})
  fixture.next.mockReset().mockResolvedValue({ current_level: 3, can_level_up: false })
  fixture.pending.mockReset().mockResolvedValue([])
  fixture.grants = []
})

describe('LevelUpModal drawer', () => {
  it('confirms average hit points from the drawer footer and shows the new level', async () => {
    const { user, onClose } = setup()
    const panel = screen.getByRole('dialog', { name: 'Повышение уровня' })
    expect(panel).toHaveClass('ui-drawer')
    expect(screen.getByRole('button', { name: 'Повысить уровень' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Среднее/ }))
    await user.click(screen.getByRole('button', { name: 'Повысить уровень' }))
    expect(fixture.levelUp).toHaveBeenCalledExactlyOnceWith(12, { hit_points_gained: 7 })
    expect(await screen.findByText('Уровень 3')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Закрыть', exact: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('opens the ASI step as the only drawer, preserves HP on return, and submits a feat', async () => {
    const { user } = setup({ character: { ...character, level: 3 } })
    fixture.next.mockResolvedValue({ current_level: 4, can_level_up: false })
    await user.click(screen.getByRole('button', { name: /Среднее/ }))
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Улучшение характеристик' })).toHaveClass('ui-drawer')
    expect(fixture.levelUp).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Далее' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await user.click(screen.getByRole('button', { name: 'Черта', exact: true }))
    await user.click(await screen.findByRole('button', { name: 'Бдительный', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(fixture.levelUp).toHaveBeenCalledExactlyOnceWith(12, { hit_points_gained: 7, choice: { type: 'FEAT', feat_id: 7 } })
    expect(await screen.findByText('Уровень 4')).toBeVisible()
  })

  it('reports a hit die once and preserves the result while returning from ASI', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      const onRollToast = vi.fn()
      const { user } = setup({ character: { ...character, level: 3 }, onRollToast })
      await user.click(screen.getByRole('button', { name: /Бросить к8/ }))
      await user.click(screen.getByRole('button', { name: 'Бросить кубик' }))
      expect(onRollToast).toHaveBeenCalledExactlyOnceWith('Хиты ур. 4 · к8', 5, 2, 7, 8)
      await user.click(screen.getByRole('button', { name: 'Далее' }))
      await user.keyboard('{Escape}')
      expect(screen.getByText(/Выпало 5/)).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Бросить кубик' })).not.toBeInTheDocument()
      expect(fixture.levelUp).not.toHaveBeenCalled()
    } finally { random.mockRestore() }
  })

  it('does not open the choices panel after a level-up, even with pending grants', async () => {
    const grant = { character_feature_id: 9, feature_name: 'Владение', groups: [] }
    fixture.pending.mockResolvedValue([grant])
    fixture.grants = [grant]
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Среднее/ }))
    await user.click(screen.getByRole('button', { name: 'Повысить уровень' }))
    expect(await screen.findByText('Уровень 3')).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Выборы' })).not.toBeInTheDocument()
    expect(fixture.pending).not.toHaveBeenCalled()
  })
})
