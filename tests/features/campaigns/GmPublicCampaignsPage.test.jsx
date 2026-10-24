import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import GmPublicCampaignsPage from '@/features/campaigns/pages/GmPublicCampaignsPage.jsx'

const state = vi.hoisted(() => ({ params: [] }))
vi.mock('@/features/articles/queries.js', () => ({ useTagSearch: () => ({ data: { items: [] }, isLoading: false }) }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaignsPage: (params) => {
    state.params.push(params)
    return { data: { items: [
      { id: 9, slug: 'mayak', title: 'Проклятие маяка', pitch: 'Шторм.\n:::gm\nСмотритель мёртв.\n:::', status: 'published', author: { id: 5, username: 'Ария' }, tags: [{ id: 1, name: 'море' }], campaign_count: 2 },
      { id: 10, slug: 'rynok', title: 'Тени рынка', pitch: '', status: 'draft', author: { id: 5, username: 'Ария' }, tags: [], campaign_count: 0 },
    ], total: 2 }, isLoading: false, refetch: vi.fn() }
  },
}))
vi.mock('@/features/campaigns/components/PresetWorkspace.jsx', () => ({ default: ({ slug }) => <div>Редактор кампании: {slug}</div> }))
vi.mock('@/features/campaigns/components/PresetCreateForm.jsx', () => ({ default: () => <div>Форма новой кампании</div> }))

function setup(url = '/gm/public-campaigns') {
  render(<MemoryRouter initialEntries={[url]}><GmPublicCampaignsPage /></MemoryRouter>)
  return userEvent.setup()
}

describe('public campaigns editor', () => {
  beforeEach(() => { state.params = [] })

  it('lists drafts and published presets as library rows without GM secrets in the pitch', () => {
    setup()
    expect(state.params.at(-1)).toMatchObject({ status: ['draft', 'published'] })
    const list = within(screen.getByRole('list', { name: 'Публичные кампании' }))
    expect(list.getByRole('button', { name: /Проклятие маяка/ })).toBeVisible()
    expect(list.getByText('Черновик')).toBeVisible()
    expect(list.queryByText(/Смотритель мёртв/)).not.toBeInTheDocument()
  })

  it('opens a preset full width with a way back, like the lore editor', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /Проклятие маяка/ }))
    expect(screen.getByText('Редактор кампании: mayak')).toBeVisible()
    expect(screen.queryByRole('list', { name: 'Публичные кампании' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Вернуться к публичным кампаниям' }))
    expect(screen.getByRole('list', { name: 'Публичные кампании' })).toBeVisible()
  })

  it('opens straight into a preset from a link and creates new ones in the same place', async () => {
    setup('/gm/public-campaigns?slug=rynok')
    expect(screen.getByText('Редактор кампании: rynok')).toBeVisible()
  })

  it('filters by status through the filters drawer', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: 'В архиве' }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(state.params.at(-1)).toMatchObject({ status: ['archived'], page: 1 })
    await user.click(screen.getByRole('button', { name: /Новая публичная кампания/ }))
    expect(screen.getByText('Форма новой кампании')).toBeVisible()
  })
})
