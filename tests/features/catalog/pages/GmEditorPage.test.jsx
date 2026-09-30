import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../helpers/render.jsx'
import { byText } from '../../../helpers/byText.js'
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

// Заменяем каждую функцию реального catalogApi на vi.fn(), сохраняя вложенную
// форму (races.subraces.image.upload и т.п.) — так конфиги редакторов, которые
// разбирают api.<resource>.<op> на верхнем уровне модуля, не падают на undefined.
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

const renderPage = () => renderWithProviders(<GmEditorPage />, { auth: false })

describe('GmEditorPage', () => {
  beforeEach(() => {
    catalogApi.races.list.mockImplementation(respond(races))
    catalogApi.skills.list.mockResolvedValue({ items: [] })
  })

  it('switches catalog editor tabs without saving', async () => {
    const user = userEvent.setup()
    catalogApi.races.get.mockResolvedValue({ ...races[0], ability_bonuses: [], granted_skills: [], subraces: [] })
    catalogApi.races.features.list.mockResolvedValue([])
    renderPage()
    await user.click(await screen.findByRole('button', { name: /^эльф/i }))
    await screen.findByRole('tab', { name: 'Основное' })
    await user.click(screen.getByRole('tab', { name: 'Характеристики и навыки' }))
    expect(screen.getByText('Бонусы характеристик')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Подрасы' }))
    expect(screen.getByText('Подрас нет')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Основное' }))
    expect(catalogApi.races.update).not.toHaveBeenCalled()
  })

  it('lists records with search input, filter button and pagination area', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Поиск по справочнику' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Поиск' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть фильтры' })).toBeInTheDocument()
  })

  it('queries the server through the search form', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.type(screen.getByRole('searchbox', { name: 'Поиск по справочнику' }), 'эльф')
    await user.click(screen.getByRole('button', { name: 'Поиск' }))

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

    await user.click(screen.getByRole('button', { name: 'Открыть фильтры' }))
    expect(screen.getByText('Размер')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Большой' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Фильтры' })).getByRole('button', { name: 'Применить' }))

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

  it('keeps current results when the filter dialog is dismissed', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.click(screen.getByRole('button', { name: 'Открыть фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Большой' }))
    await user.click(screen.getByRole('button', { name: 'Закрыть фильтры' }))

    expect(screen.getByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    expect(catalogApi.races.list).not.toHaveBeenCalledWith(expect.objectContaining({ race_size: ['LARGE'] }))
  })

  it('keeps keyboard focus in the drawer and returns it to the filter button on Escape', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })
    const trigger = screen.getByRole('button', { name: 'Открыть фильтры' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Фильтры' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрыть фильтры' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    await user.tab({ shift: true })
    expect(within(screen.getByRole('dialog', { name: 'Фильтры' })).getByRole('button', { name: 'Применить' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Закрыть фильтры' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('removes an applied filter directly from the results', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })
    await user.click(screen.getByRole('button', { name: 'Открыть фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Большой' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Фильтры' })).getByRole('button', { name: 'Применить' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^эльф/i })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Убрать фильтр Размер: Большой' }))

    expect(await screen.findByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сбросить все' })).not.toBeInTheDocument()
  })

  it('clears applied filters and refreshes results immediately from the drawer', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })
    await user.click(screen.getByRole('button', { name: 'Открыть фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Большой' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Фильтры' })).getByRole('button', { name: 'Применить' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /^эльф/i })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Фильтры применены. Изменить фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Сбросить' }))

    expect(screen.queryByRole('dialog', { name: 'Фильтры' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^великан/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть фильтры' })).toBeInTheDocument()
  })

  it('shows pagination below the list and navigates pages', async () => {
    catalogApi.races.list.mockImplementation(respond(manyRaces))
    const user = userEvent.setup()
    renderPage()
    await screen.findByText(byText('Стр. 1 из 2'))

    await user.click(screen.getByRole('button', { name: 'Следующая страница' }))

    await waitFor(() => {
      expect(catalogApi.races.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, size: PAGE_SIZE }),
      )
    })
    expect(screen.getByText(byText('Стр. 2 из 2'))).toBeInTheDocument()
  })

  it('shows an empty message when nothing matches the query', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('button', { name: /^эльф/i })

    await user.type(screen.getByRole('searchbox', { name: 'Поиск по справочнику' }), 'zzz')
    await user.click(screen.getByRole('button', { name: 'Поиск' }))

    await waitFor(() => {
      expect(screen.getByText('Ничего не найдено по запросу')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Сбросить поиск и фильтры' }))
    expect(await screen.findByRole('button', { name: /^эльф/i })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Поиск по справочнику' })).toHaveValue('')
  })
})
