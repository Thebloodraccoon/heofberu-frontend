import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'

const rows = (from, count) => Array.from({ length: count }, (_, i) => ({ id: from + i, name: `Запись ${from + i}` }))

const renderList = (fetchPage, props = {}) =>
  renderWithProviders(
    <SearchPickerList queryKey={['test-picker']} fetchPage={fetchPage} pageSize={2} {...props}>
      {(items) => <ul>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>}
    </SearchPickerList>,
    { auth: false },
  )

// jsdom не считает раскладку: «на экране» и «прокрутки нет» — тогда список
// сам догружает страницы, пока они не кончатся.
const visibleList = () => {
  const spies = [
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300),
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(300),
  ]
  return () => spies.forEach((spy) => spy.mockRestore())
}

describe('SearchPickerList paging', () => {
  let restore = () => {}
  beforeEach(() => {
    restore = visibleList()
  })
  afterEach(() => restore())

  it('keeps loading while fewer than total are loaded, and stops once a short last page reaches total', async () => {
    const fetchPage = vi.fn(({ page }) => Promise.resolve({ items: page < 3 ? rows(page * 2 - 1, 2) : rows(5, 1), total: 5, size: 2 }))
    renderList(fetchPage)

    expect(await screen.findByText('Запись 5')).toBeInTheDocument()
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3))
    expect(fetchPage.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 3])
  })

  it('an empty page ends the list even if total says otherwise', async () => {
    const fetchPage = vi.fn(({ page }) => Promise.resolve({ items: page === 1 ? rows(1, 2) : [], total: 10, size: 2 }))
    renderList(fetchPage)

    expect(await screen.findByText('Запись 2')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('without total there is only one page', async () => {
    const fetchPage = vi.fn(() => Promise.resolve({ items: rows(1, 2) }))
    renderList(fetchPage)

    expect(await screen.findByText('Запись 2')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('fills up when exclude hides the whole first page; «nothing found» waits for the last page', async () => {
    const fetchPage = vi.fn(({ page }) => Promise.resolve({ items: rows(page * 2 - 1, 2), total: 4, size: 2 }))
    renderList(fetchPage, { exclude: (item) => item.id <= 4 })

    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument()
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('does not loop on a failed next page: one request, then only «Повторить» asks again', async () => {
    const fetchPage = vi.fn(({ page }) =>
      page === 1 ? Promise.resolve({ items: rows(1, 2), total: 4, size: 2 }) : Promise.reject(new Error('Сбой сети')),
    )
    renderList(fetchPage)

    expect(await screen.findByText(/Сбой сети/)).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Ничего не найдено')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Повторить/ }))
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3))
    expect(fetchPage.mock.calls[2][0].page).toBe(2)
  })
})

describe('SearchPickerList search and empty state', () => {
  it('a new search starts again from the first page and passes the text', async () => {
    const fetchPage = vi.fn(({ page, search }) => Promise.resolve({ items: search ? [{ id: 9, name: 'Найденная' }] : rows(page, 1), total: 1, size: 2 }))
    renderList(fetchPage)
    expect(await screen.findByText('Запись 1')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Поиск записей' }), 'меч')
    await userEvent.click(screen.getByRole('button', { name: 'Найти' }))

    expect(await screen.findByText('Найденная')).toBeInTheDocument()
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 1, size: 2, search: 'меч' })
  })

  it('shows no «nothing found» while the query is disabled', () => {
    const fetchPage = vi.fn()
    renderList(fetchPage, { enabled: false })

    expect(screen.queryByText('Ничего не найдено')).not.toBeInTheDocument()
    expect(fetchPage).not.toHaveBeenCalled()
  })
})
