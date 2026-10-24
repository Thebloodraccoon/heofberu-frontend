import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import PublicCampaignsPage from '@/features/campaigns/pages/PublicCampaignsPage.jsx'

const state = vi.hoisted(() => ({ params: [], loading: false, remember: vi.fn() }))
const tags = [{ id: 3, name: 'море' }, { id: 4, name: 'тайна' }, { id: 5, name: 'остров' }, { id: 6, name: 'шторм' }, { id: 7, name: 'ночь' }]
vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [{ id: 3, name: 'море' }] }, isLoading: false }),
  useTagsByIds: (ids) => ids.map((id) => ({ id, name: id === 3 ? 'море' : 'тайна' })),
  useRememberTags: () => state.remember,
}))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaignsPage: (params) => {
    state.params.push(params)
    return state.loading ? { isLoading: true } : { data: { items: [{ id: 9, slug: 'mayak', title: 'Проклятие маяка', pitch: 'Шторм.\n:::gm\nСекрет.\n:::', author: { username: 'Автор' }, campaign_count: 2, tags }], total: 36 } }
  },
}))

function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="Адрес">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Назад браузером</button></>
}

function Detail() {
  const { state: locationState } = useLocation()
  return <Link to={{ pathname: '/public-campaigns', search: locationState?.campaignListSearch }} state={{ restoreCampaignList: true }}>Доска приключений</Link>
}

function setup(entry = '/public-campaigns') {
  const ui = () => <MemoryRouter initialEntries={[entry]}><Navigation /><Routes><Route path="/public-campaigns" element={<PublicCampaignsPage />} /><Route path="/public-campaigns/:slug" element={<Detail />} /></Routes></MemoryRouter>
  const result = render(ui())
  return { user: userEvent.setup(), ...result, ui }
}

describe('public campaign results', () => {
  beforeEach(() => {
    state.params = []
    state.loading = false
    sessionStorage.clear()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('loads search, tags and page from the URL and restores them through browser history', async () => {
    const { user } = setup('/public-campaigns?q=маяк&tags=3&page=2')
    expect(state.params.at(-1)).toMatchObject({ q: 'маяк', tag_id: [3], page: 2 })
    expect(screen.getByRole('searchbox')).toHaveValue('маяк')
    expect(screen.getByRole('button', { name: 'Убрать фильтр #море' })).toBeVisible()
    await user.clear(screen.getByRole('searchbox'))
    await user.type(screen.getByRole('searchbox'), 'шторм')
    await user.click(screen.getByRole('button', { name: 'Найти', exact: true }))
    expect(state.params.at(-1)).toMatchObject({ q: 'шторм', tag_id: [3], page: 1 })
    await user.click(screen.getByRole('button', { name: 'Назад браузером' }))
    expect(state.params.at(-1)).toMatchObject({ q: 'маяк', tag_id: [3], page: 2 })
    expect(screen.getByRole('searchbox')).toHaveValue('маяк')
  })

  it('resets pagination when applying or clearing tags and preserves the search', async () => {
    const { user } = setup('/public-campaigns?q=маяк&page=2')
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    const filters = within(screen.getByRole('dialog', { name: 'Фильтры кампаний' }))
    await user.click(filters.getByRole('button', { name: /^#море/ }))
    await user.click(filters.getByRole('button', { name: 'Применить' }))
    expect(state.params.at(-1)).toMatchObject({ q: 'маяк', tag_id: [3], page: 1 })
    expect(state.remember).toHaveBeenCalledWith([{ id: 3, name: 'море' }])
    await user.click(screen.getByRole('button', { name: 'Следующая страница' }))
    expect(state.params.at(-1).page).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(state.params.at(-1)).toMatchObject({ q: 'маяк', tag_id: undefined, page: 1 })
  })

  it.each(['Доска приключений', 'Назад браузером'])('restores the results and scroll after returning via %s', async (back) => {
    const { user } = setup('/public-campaigns?q=маяк&tags=3&page=2')
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 640 })
    fireEvent.scroll(window)
    await user.click(screen.getByRole('link', { name: /Проклятие маяка/ }))
    window.scrollTo.mockClear()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    if (back === 'Доска приключений') await user.click(screen.getByRole('link', { name: back }))
    else await user.click(screen.getByRole('button', { name: back }))
    expect(screen.getByLabelText('Адрес')).toHaveTextContent('/public-campaigns?q=маяк&tags=3&page=2')
    expect(state.params.at(-1)).toMatchObject({ q: 'маяк', tag_id: [3], page: 2 })
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 640)
  })

  it('waits for results before restoring scroll', () => {
    sessionStorage.setItem('public-campaigns:scroll:', '400')
    state.loading = true
    const { rerender, ui } = setup()
    expect(window.scrollTo).not.toHaveBeenCalled()
    state.loading = false
    rerender(ui())
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 400)
  })

  it('keeps results usable when session storage is unavailable', () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
    try {
      setup()
      expect(screen.getByRole('link', { name: /Проклятие маяка/ })).toBeVisible()
      expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0)
    } finally { storage.mockRestore() }
  })

  it.each(['0', '-2', '1.5', 'Infinity', 'bad'])('ignores invalid page %s', (page) => {
    setup(`/public-campaigns?page=${page}`)
    expect(state.params.at(-1).page).toBe(1)
  })

  it('hides master secrets and indicates extra tags on a campaign card', () => {
    setup()
    const card = screen.getByRole('link', { name: /Проклятие маяка/ })
    expect(within(card).getByText('@Автор')).toBeVisible()
    expect(card).toHaveTextContent('Шторм.')
    expect(card).not.toHaveTextContent('Секрет.')
    expect(within(card).getByLabelText('Ещё тегов: 1')).toHaveTextContent('+1')
    expect(within(card).getByLabelText('Ещё тегов: 1')).toHaveAttribute('title', '#ночь')
  })
})
