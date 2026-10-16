import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import PublicCampaignPage from '@/features/campaigns/pages/PublicCampaignPage.jsx'

const state = vi.hoisted(() => ({ auth: {} }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaign: () => ({ data: {
    id: 9, slug: 'mayak', title: 'Проклятие маяка', pitch: 'Шторм.\n:::gm\nСмотритель мёртв.\n:::', status: 'published', author: { id: 5, username: 'Автор' }, tags: [], campaign_count: 2,
    description_markdown: 'Старый маяк.\n:::gm\nКлад под лестницей.\n:::', articles: [{ article_id: 1, slug: 'lestnica', title: 'Лестница', article_type: 'location', position: 0, note: null }],
  }, isLoading: false, refetch: vi.fn() }),
  usePublicCampaignCharacters: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  usePublicCampaignReviews: () => ({ data: { items: [], total: 0 }, isLoading: false }),
}))
vi.mock('@/features/campaigns/components/CampaignFormDrawer.jsx', () => ({ default: () => <div>Новая кампания по пресету</div> }))

function Where() {
  const location = useLocation()
  return <p>Адрес: {location.pathname}{location.search}</p>
}
function setup() {
  render(<MemoryRouter initialEntries={['/public-campaigns/mayak']}><Routes><Route path="/public-campaigns/:slug" element={<PublicCampaignPage />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

describe('public campaign page', () => {
  beforeEach(() => { state.auth = {} })

  it('shows even a GM the page as players see it', () => {
    state.auth = { user: { id: 77 }, isGM: true, isFounder: false }
    setup()
    expect(screen.getByText('Старый маяк.')).toBeVisible()
    expect(screen.queryByText(/Клад под лестницей/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Смотритель мёртв/)).not.toBeInTheDocument()
    expect(screen.queryByText('Лестница')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Действия ГМ' })).getByText(/Так страницу видят игроки/)).toBeVisible()
  })

  it('sends the GM to the editor instead of editing on the page', async () => {
    state.auth = { user: { id: 5 }, isGM: true, isFounder: false }
    const user = setup()
    expect(screen.queryByRole('button', { name: /Быстрая правка/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /В редактор/ }))
    expect(screen.getByText('Адрес: /gm/public-campaigns?slug=mayak')).toBeVisible()
  })

  it('has no GM actions for guests and players', () => {
    setup()
    expect(screen.queryByRole('region', { name: 'Действия ГМ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Начать кампанию/ })).not.toBeInTheDocument()
  })
})
