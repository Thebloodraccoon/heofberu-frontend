import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CampaignDetailPage from '@/features/campaigns/pages/CampaignDetailPage.jsx'

const state = vi.hoisted(() => ({ campaign: null, archive: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { id: 5 } }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaign: () => ({ data: state.campaign, isLoading: false, refetch: vi.fn() }),
  useArchiveCampaign: () => ({ mutate: state.archive, isPending: false, reset: vi.fn() }),
  useRestoreCampaign: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateCampaign: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('@/features/campaigns/components/RosterPanel.jsx', () => ({ default: () => <div>Панель состава</div> }))
vi.mock('@/features/campaigns/components/SessionsPanel.jsx', () => ({ default: () => <div>Панель сессий</div> }))
vi.mock('@/features/campaigns/components/NotesPanel.jsx', () => ({ default: () => <div>Панель заметок</div> }))
vi.mock('@/features/campaigns/components/ReviewsPanel.jsx', () => ({ default: () => <div>Панель отзывов</div> }))
vi.mock('@/features/campaigns/components/CampaignFormDrawer.jsx', () => ({ default: ({ extra }) => <div>Форма кампании{extra}</div> }))

const campaign = (patch) => ({ id: 1, title: 'Нова', status: 'active', viewer_role: 'gm', owner: { id: 5, username: 'Я' }, public_campaign: null, description_markdown: 'Город.\n:::gm\nМэр — культист.\n:::', archived_at: null, ...patch })
function setup() {
  render(<MemoryRouter initialEntries={['/campaigns/1']}><Routes><Route path="/campaigns/:id" element={<CampaignDetailPage />} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

describe('campaign detail page', () => {
  beforeEach(() => { state.archive.mockClear() })

  it('gives the campaign GM notes, settings and GM secrets in the description', () => {
    state.campaign = campaign()
    setup()
    expect(screen.getByRole('tab', { name: 'Заметки' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Настройки/ })).toBeVisible()
    expect(screen.getByText('Только для мастера')).toBeVisible()
  })

  it('shows a GM-role player of another table the player view', async () => {
    state.campaign = campaign({ viewer_role: 'player', owner: { id: 9, username: 'Саруман' }, description_markdown: 'Город.' })
    const user = setup()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Обзор', 'Сессии', 'Отзывы'])
    expect(screen.queryByRole('button', { name: /Настройки/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Мои игры/ })).toHaveAttribute('href', '/campaigns')
    await user.click(screen.getByRole('tab', { name: 'Сессии' }))
    expect(screen.getByText('Панель сессий')).toBeVisible()
  })

  it('archives from the settings, after a confirmation because active characters are released', async () => {
    state.campaign = campaign()
    const user = setup()
    await user.click(screen.getByRole('button', { name: /Настройки/ }))
    await user.click(screen.getByRole('button', { name: 'В архив' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('активные персонажи будут сняты с игры')
    await user.click(screen.getAllByRole('button', { name: 'В архив' }).at(-1))
    expect(state.archive).toHaveBeenCalledWith(1, expect.any(Object))
  })
})
