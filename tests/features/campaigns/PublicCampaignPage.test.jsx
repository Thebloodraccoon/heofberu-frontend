import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import PublicCampaignPage from '@/features/campaigns/pages/PublicCampaignPage.jsx'

const state = vi.hoisted(() => ({ auth: {}, status: 'published', create: vi.fn() }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaign: () => ({ data: {
    id: 9, slug: 'mayak', title: 'Проклятие маяка', pitch: 'Шторм.\n:::gm\nСмотритель мёртв.\n:::', status: state.status, author: { id: 5, username: 'Автор' }, tags: [], campaign_count: 2,
    description_markdown: 'Старый маяк.\n:::gm\nКлад под лестницей.\n:::', articles: [{ article_id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', position: 0, note: null }],
  }, isLoading: false, refetch: vi.fn() }),
  usePublicCampaignCharacters: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  usePublicCampaignReviews: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  useCreateCampaign: () => ({ mutate: state.create, isPending: false }),
  useUpdateCampaign: () => ({ isPending: false }),
  usePresetOptions: () => ({ data: [{ id: 9, title: 'Проклятие маяка' }] }),
}))

function Where() {
  const location = useLocation()
  return <p>Адрес: {location.pathname}{location.search}</p>
}
function setup(entry = '/public-campaigns/mayak') {
  render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/public-campaigns/:slug" element={<PublicCampaignPage />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

describe('public campaign page', () => {
  beforeEach(() => {
    state.auth = {}
    state.status = 'published'
    state.create = vi.fn((body, { onSuccess }) => onSuccess({ id: 25 }))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('shows the GM the master text in the description and hides it in the player view', async () => {
    state.auth = { user: { id: 77 }, isGM: true, isFounder: false }
    const user = setup()
    const actions = within(screen.getByRole('group', { name: 'Действия ГМ' }))
    expect(screen.getByText('@Автор')).toBeVisible()
    expect(actions.getByRole('button', { name: /Создать игровой стол/ })).toBeVisible()
    expect(actions.queryByRole('button', { name: /Редактировать/ })).not.toBeInTheDocument()
    expect(actions.getByRole('button', { name: /База знаний/ })).toBeVisible()
    expect(screen.getByText('Старый маяк.')).toBeVisible()
    expect(within(screen.getByText('Только для мастера').closest('aside')).getByText('Клад под лестницей.')).toBeVisible()
    expect(screen.queryByText(/Смотритель мёртв/)).not.toBeInTheDocument()
    expect(screen.queryByText('Лестница')).not.toBeInTheDocument()
    const playerView = actions.getByRole('switch', { name: /Глазами игрока/ })
    expect(playerView).toHaveAttribute('aria-checked', 'false')
    await user.click(playerView)
    expect(playerView).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Глазами игрока: секреты мастера скрыты.')).toBeVisible()
    expect(screen.queryByText(/Клад под лестницей/)).not.toBeInTheDocument()
    expect(screen.getByText('Старый маяк.')).toBeVisible()
  })

  it('sends the GM to the editor instead of editing on the page', async () => {
    state.auth = { user: { id: 5 }, isGM: true, isFounder: false }
    const user = setup()
    expect(screen.queryByRole('button', { name: /Быстрая правка/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Редактировать/ }))
    expect(screen.getByText('Адрес: /gm/public-campaigns?slug=mayak')).toBeVisible()
  })

  it('has no GM actions for guests and players', () => {
    setup()
    expect(screen.queryByRole('group', { name: 'Действия ГМ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: /Глазами игрока/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Клад под лестницей/)).not.toBeInTheDocument()
  })

  it('creates a table directly from the selected public campaign', async () => {
    state.auth = { user: { id: 77 }, isGM: true }
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Создать игровой стол' }))
    const drawer = within(screen.getByRole('dialog', { name: 'Новый игровой стол' }))
    expect(drawer.getByText('Проклятие маяка')).toBeVisible()
    await user.click(drawer.getByRole('button', { name: 'Создать стол', exact: true }))
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ public_campaign_id: 9 }), expect.any(Object))
    expect(screen.getByText('Адрес: /campaigns/25')).toBeVisible()
  })

  it('closes table creation without navigating away from the campaign', async () => {
    state.auth = { user: { id: 77 }, isGM: true }
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Создать игровой стол' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Проклятие маяка' })).toBeVisible()
    expect(state.create).not.toHaveBeenCalled()
  })

  it('allows the founder to edit another author’s campaign', () => {
    state.auth = { user: { id: 77 }, isGM: true, isFounder: true }
    setup()
    expect(screen.getByRole('button', { name: 'Редактировать' })).toBeVisible()
  })

  it('does not offer table creation for an archived campaign', () => {
    state.auth = { user: { id: 5 }, isGM: true }
    state.status = 'archived'
    setup()
    expect(screen.queryByRole('button', { name: 'Создать игровой стол' })).not.toBeInTheDocument()
  })

  it('links back to the same results and opens the description at the top', async () => {
    const user = setup({ pathname: '/public-campaigns/mayak', state: { campaignListSearch: '?q=море&tags=3&page=2' } })
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
    expect(screen.getByRole('link', { name: 'Доска приключений' })).toHaveAttribute('href', '/public-campaigns?q=море&tags=3&page=2')
    await user.click(screen.getByRole('link', { name: 'Доска приключений' }))
    expect(screen.getByText('Адрес: /public-campaigns?q=море&tags=3&page=2')).toBeVisible()
  })

  it('always shows the description and switches reviews and heroes below it', async () => {
    const user = setup()
    expect(screen.getByText('Старый маяк.')).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Отзывы' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Отзывов пока нет.')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Герои' }))
    expect(screen.getByRole('tab', { name: 'Герои' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Пока никто не показал своих героев.')).toBeVisible()
    expect(screen.getByText('Старый маяк.')).toBeVisible()
  })
})
