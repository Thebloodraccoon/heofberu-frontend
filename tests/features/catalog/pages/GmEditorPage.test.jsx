import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../helpers/render.jsx'
import GmEditorPage from '@/features/catalog/pages/GmEditorPage.jsx'
import { catalogApi } from '@/features/catalog/api.js'

const PAGE_SIZE = 50

const races = [
  { id: 1, name: 'Эльф', size: 'MEDIUM', speed: 30, description: 'Изящный народец' },
  { id: 2, name: 'Великан', size: 'LARGE', speed: 40, description: 'Огромный исполин' },
]

const manyRaces = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: `Раса ${i + 1}`,
  size: 'MEDIUM',
  speed: 30,
  description: '',
}))

const respond = (items) => (params = {}) => {
  let out = items
  if (params.search) {
    const q = params.search.toLowerCase()
    out = out.filter((r) => (r.name + ' ' + (r.description ?? '')).toLowerCase().includes(q))
  }
  if (params.race_size) {
    out = out.filter((r) => params.race_size.includes(r.size))
  }
  const size = params.size || PAGE_SIZE
  const page = params.page || 1
  const start = (page - 1) * size
  return Promise.resolve({ items: out.slice(start, start + size), total: out.length })
}

vi.mock('@/features/catalog/api.js', () => ({
  catalogApi: {
    races: { list: vi.fn() },
    skills: { list: vi.fn() },
  },
}))

const renderPage = () => renderWithProviders(<GmEditorPage />, { auth: false })

describe('GmEditorPage', () => {
  beforeEach(() => {
    catalogApi.races.list.mockImplementation(respond(races))
    catalogApi.skills.list.mockResolvedValue({ items: [] })
  })

  it('lists records with search input, filter button and pagination area', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Поиск: имя, описание...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '⌕' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Фильтр' })).toBeInTheDocument()
  })

  it('queries the server by search on ⌕ and Enter', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.type(screen.getByPlaceholderText('Поиск: имя, описание...'), 'эльф')
    await user.click(screen.getByRole('button', { name: '⌕' }))

    await waitFor(() => {
      expect(catalogApi.races.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'эльф', page: 1, size: PAGE_SIZE }),
      )
    })
    expect(screen.getByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^великан/i })).not.toBeInTheDocument()
    })
  })

  it('filters races by size through the filter modal', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.click(screen.getByRole('button', { name: 'Фильтр' }))
    expect(screen.getByText('Размер')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Большой' }))
    await user.click(screen.getByRole('button', { name: '✕' }))

    await waitFor(() => {
      expect(catalogApi.races.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ race_size: ['LARGE'], page: 1 }),
      )
    })
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^эльф/i })).not.toBeInTheDocument()
    })
  })

  it('shows pagination below the list and navigates pages', async () => {
    catalogApi.races.list.mockImplementation(respond(manyRaces))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(/Стр\. 1 из 2/)

    await user.click(screen.getByRole('button', { name: /вперёд/i }))

    await waitFor(() => {
      expect(catalogApi.races.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, size: PAGE_SIZE }),
      )
    })
    expect(screen.getByText(/Стр\. 2 из 2/)).toBeInTheDocument()
  })

  it('shows an empty message when nothing matches the query', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.type(screen.getByPlaceholderText('Поиск: имя, описание...'), 'zzz')
    await user.click(screen.getByRole('button', { name: '⌕' }))

    await waitFor(() => {
      expect(screen.getByText('Ничего не найдено по запросу')).toBeInTheDocument()
    })
  })
})