import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmCharactersPage from '@/features/characters/pages/GmCharactersPage.jsx'

vi.mock('@/features/characters/queries.js', () => ({ useAllCharacters: () => ({ data: [
  { id: 1, name: 'Астра', owner_id: 1, level: 3, class_id: 1, subclass_id: 10, current_hp: 5, max_hp: 10 },
  { id: 2, name: 'Бор', owner_id: 2, level: 8, class_id: 2, current_hp: 20, max_hp: 20 },
], refetch: vi.fn() }) }))
vi.mock('@/features/users/queries.js', () => ({ useUsers: () => ({ data: [{ id: 1, username: 'Анна' }, { id: 2, username: 'Иван' }] }) }))
vi.mock('@/features/catalog/queries.js', () => ({ useClasses: () => ({ data: [{ id: 1, name: 'Маг', subclasses: [{ id: 10, name: 'Иллюзии' }] }, { id: 2, name: 'Воин', subclasses: [] }] }) }))
vi.mock('@/features/characters/components/sheet/GmCharacterPanel.jsx', () => ({ default: ({ character }) => <div>Редактор: {character.name}</div> }))
function setup() {
  render(<MemoryRouter><GmCharactersPage /></MemoryRouter>)
  return userEvent.setup()
}
const list = () => within(screen.getByRole('complementary', { name: 'Персонажи игроков' }))

describe('GM character list', () => {
  it('sorts by level and searches by player name', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Сортировка персонажей' }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Уровень: по убыванию' }))
    expect(list().getAllByText(/Астра|Бор/).map((node) => node.textContent)).toEqual(['Бор', 'Астра'])
    await user.type(screen.getByRole('searchbox', { name: 'Поиск персонажей' }), 'Анна')
    await user.click(screen.getByRole('button', { name: 'Найти' }))
    expect(list().getByText('Астра')).toBeVisible()
    expect(list().queryByText('Бор')).not.toBeInTheDocument()
  })

  it('applies level, class and subclass together and resets them', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.type(screen.getByRole('spinbutton', { name: 'До' }), '4')
    await user.click(screen.getByText('Все классы'))
    await user.click(screen.getByRole('option', { name: 'Маг' }))
    await user.click(screen.getByText('Все подклассы'))
    await user.click(screen.getByRole('option', { name: 'Иллюзии' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(list().getByText('Астра')).toBeVisible()
    expect(list().queryByText('Бор')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(list().getByText('Бор')).toBeVisible()
    await user.click(list().getAllByRole('button', { name: /Изменить/ })[0])
    expect(screen.getByText('Редактор: Астра')).toBeVisible()
  })
})
