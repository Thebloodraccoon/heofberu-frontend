import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import SpellPickerModal from '@/features/characters/components/sheet/SpellPickerModal.jsx'

const mocks = vi.hoisted(() => ({ known: [], add: vi.fn() }))
vi.mock('@/features/characters/queries.js', () => ({
  useCharacterSpells: () => ({ data: mocks.known }),
  useCharacterSpellSlots: () => ({ data: [{ spell_level: 'LEVEL_1', total: 2 }, { spell_level: 'CANTRIP', total: 1 }] }),
}))
vi.mock('@/features/characters/api.js', () => ({ charactersApi: { spells: { add: mocks.add } } }))
vi.mock('@/features/catalog/queries.js', () => ({ useSpellDetail: () => ({ data: { description: 'Описание заклинания' } }) }))

let fetchMock
const spell = (id, level = 'LEVEL_1', extra = {}) => ({ id, name: `Заклинание ${id}`, level, school: 'EVOCATION', ...extra })
const respond = (items, total = items.length) => ({ ok: true, status: 200, text: async () => JSON.stringify({ items, total }) })
const setup = () => {
  const rendered = renderWithProviders(<SpellPickerModal character={{ id: 12, class_id: 2 }} onClose={vi.fn()} onError={vi.fn()} />, { auth: false })
  return { ...rendered, user: userEvent.setup() }
}
const urls = () => fetchMock.mock.calls.map(([url]) => new URL(url))

beforeEach(() => {
  mocks.known = []
  mocks.add.mockResolvedValue({})
  fetchMock = vi.fn().mockResolvedValue(respond([spell(1), spell(2), spell(3)]))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('Character spell selection', () => {
  it('requests the selected level, loads more pages, and resets selection and pagination on return', async () => {
    fetchMock.mockImplementation(async (url) => {
      const params = new URL(url).searchParams
      if (params.get('level') === 'CANTRIP') return respond([spell(200, 'CANTRIP')])
      return params.get('page') === '2'
        ? respond([spell(101)], 101)
        : respond(Array.from({ length: 100 }, (_, i) => spell(i + 1)), 101)
    })
    const { user } = setup()
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /1 уровень/ }))
    await user.click(await screen.findByRole('checkbox', { name: /Заклинание 1(?:\D|$)/ }))
    expect(urls()[0].pathname).toMatch(/\/spells$/)
    expect(Object.fromEntries(urls()[0].searchParams)).toEqual({ page: '1', size: '100', level: 'LEVEL_1', class_id: '2' })
    await user.click(screen.getAllByRole('button', { name: 'Подробнее' })[0])
    expect(screen.getByText('Описание заклинания')).toBeVisible()
    expect(screen.getByRole('button', { name: /Фильтры/ })).toBeInTheDocument()
    // Следующая страница — прокруткой списка до низа, без кнопки.
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument()
    fireEvent.scroll(document.querySelector('.grant-picker-list'))
    expect(await screen.findByRole('checkbox', { name: /Заклинание 101/ })).toBeVisible()
    expect(urls().at(-1).searchParams.get('page')).toBe('2')
    await user.click(screen.getByRole('button', { name: 'Назад' }))
    await user.click(screen.getByRole('button', { name: /Заговоры/ }))
    expect(await screen.findByRole('checkbox', { name: /Заклинание 200/ })).toBeVisible()
    expect(urls().at(-1).searchParams.get('level')).toBe('CANTRIP')
    expect(screen.queryByText('Описание заклинания')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выучить ячейку' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Назад' }))
    await user.click(screen.getByRole('button', { name: /1 уровень/ }))
    expect(await screen.findByRole('checkbox', { name: /Заклинание 1(?:\D|$)/ })).not.toBeChecked()
    expect(screen.queryByRole('checkbox', { name: /Заклинание 101/ })).not.toBeInTheDocument()
    expect(urls().at(-1).searchParams.get('page')).toBe('1')
  }, 15000)

  it('excludes known spells, asks the server for available ones, respects capacity and refreshes learned spells', async () => {
    mocks.known = [spell(1)]
    fetchMock.mockResolvedValue(respond([spell(1), spell(2), spell(3)]))
    const { user, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    await user.click(screen.getByRole('button', { name: /1 уровень/ }))
    await user.click(await screen.findByRole('checkbox', { name: /Заклинание 2/ }))
    expect(screen.queryByRole('checkbox', { name: /Заклинание 1/ })).not.toBeInTheDocument()
    // Недоступные классу/расе отсекает сервер: персонаж уходит в запрос.
    expect(urls().at(-1).searchParams.get('class_id')).toBe('2')
    expect(screen.getByRole('checkbox', { name: /Заклинание 3/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Выучить ячейку' }))
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith(12, { spell_id: 2 }))
    expect(invalidate).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /1 уровень/ })).toBeVisible()
  })

  it('shows loading, retries errors and distinguishes an empty result', async () => {
    let resolve
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /1 уровень/ }))
    expect(screen.queryByText('Для этой ячейки нет доступных заклинаний.')).not.toBeInTheDocument()
    resolve({ ok: false, status: 500, text: async () => JSON.stringify({ detail: 'Сбой загрузки' }) })
    expect(await screen.findByText('Сбой загрузки')).toBeVisible()
    fetchMock.mockResolvedValue(respond([]))
    await user.click(screen.getByRole('button', { name: /Повторить/ }))
    expect(await screen.findByText('Для этой ячейки нет доступных заклинаний.')).toBeVisible()
  })
})
