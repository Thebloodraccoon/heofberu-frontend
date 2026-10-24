import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CampaignOverview from '@/features/campaigns/components/CampaignOverview.jsx'
import { useTableSchedule } from '@/features/campaigns/queries.js'
import { nextCampaignSession } from '@/features/campaigns/overview.js'
import request from '@/lib/api/httpClient.js'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn() }))

const campaign = { id: 1, title: 'Маяк', viewer_role: 'gm', description_markdown: 'История у моря.' }
const session = (id, scheduled_at, patch) => ({ id, title: `Сессия ${id}`, number: id, status: 'planned', scheduled_at, ...patch })
const participant = (id, status = 'active') => ({ id, status, character: { id, name: `Герой ${id}`, level: 3, class_name: 'воин' }, owner: { id, username: `Игрок${id}` } })
function wrapper({ children }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}
const setup = (patch) => render(<CampaignOverview campaign={{ ...campaign, ...patch }} />, { wrapper })

describe('campaign overview', () => {
  beforeEach(() => { request.mockReset().mockResolvedValue({ items: [], total: 0 }) })

  it('chooses the soonest future planned session regardless of session number', async () => {
    request.mockImplementation((path) => Promise.resolve(path.endsWith('/sessions') ? { items: [
      session(1, '2099-03-01T12:00:00Z'), session(2, '2099-02-01T12:00:00Z'),
      session(3, '2099-01-01T12:00:00Z', { status: 'cancelled' }), session(4, '2000-01-01T12:00:00Z'),
    ], total: 4 } : { items: [], total: 0 }))
    setup()
    expect(await screen.findByRole('link', { name: /Сессия 2/ })).toHaveAttribute('href', '/campaigns/1/sessions/2')
    expect(screen.queryByText('Сессия 1')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Все сессии' })).toHaveAttribute('href', '/?tab=sessions')
    expect(screen.getByText('История у моря.')).toBeVisible()
    expect(request).toHaveBeenCalledWith('/campaigns/1/sessions', { params: { status: 'planned', page: 1, size: 100 } })
  })

  it('counts only active characters across all roster pages', async () => {
    request.mockImplementation((path, { params }) => Promise.resolve(path.endsWith('/characters') ? {
      items: params.page === 1 ? Array.from({ length: 100 }, (_, i) => participant(i + 1, 'removed')) : [participant(101)], total: 101,
    } : { items: [], total: 0 }))
    setup()
    expect(await screen.findByRole('link', { name: /Герой 101/ })).toHaveAttribute('href', '/characters/101')
    expect(screen.getByRole('heading', { name: /В игре/ })).toHaveTextContent('В игре1')
    expect(screen.queryByText('Герой 1')).not.toBeInTheDocument()
    expect(request).toHaveBeenCalledWith('/campaigns/1/characters', { params: { page: 2, size: 100 } })
  })

  it('shows undated sessions honestly and keeps sessions and roster empty states separate', async () => {
    request.mockImplementation((path) => Promise.resolve(path.endsWith('/sessions') ? { items: [session(5, null)], total: 1 } : { items: [], total: 0 }))
    setup()
    expect(await screen.findByRole('link', { name: /Сессия 5/ })).toHaveTextContent('Дата не назначена')
    expect(screen.getByText(/Активных персонажей нет/)).toBeVisible()
  })

  it('does not request or show the roster for a player', async () => {
    setup({ viewer_role: 'player' })
    expect(await screen.findByText('ГМ ещё не назначил следующую сессию.')).toBeVisible()
    expect(request.mock.calls.some(([path]) => path.endsWith('/characters'))).toBe(false)
    expect(screen.queryByRole('link', { name: 'Весь состав' })).not.toBeInTheDocument()
  })

  it('previews four characters and links to the full roster while keeping the total count', async () => {
    request.mockImplementation((path) => Promise.resolve(path.endsWith('/characters') ? { items: Array.from({ length: 6 }, (_, i) => participant(i + 1)), total: 6 } : { items: [], total: 0 }))
    setup()
    const list = await screen.findByRole('list', { name: 'Персонажи в игре' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: /В игре/ })).toHaveTextContent('В игре6')
    expect(screen.getByRole('link', { name: 'Весь состав' })).toHaveAttribute('href', '/?tab=roster')
    expect(screen.queryByText('Герой 5')).not.toBeInTheDocument()
  })

  it('shows loading without a premature empty state', () => {
    request.mockImplementation(() => new Promise(() => {}))
    setup()
    expect(screen.getByRole('region', { name: 'Ближайшая сессия' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText(/Предстоящих сессий нет/)).not.toBeInTheDocument()
  })

  it('lets the GM retry a failed session summary while the roster remains available', async () => {
    let failed = true
    request.mockImplementation((path) => path.endsWith('/sessions') && failed ? Promise.reject(new Error('Нет соединения')) : Promise.resolve({ items: [], total: 0 }))
    const user = userEvent.setup()
    setup()
    expect(await screen.findByText('Нет соединения')).toBeVisible()
    expect(screen.getByText(/Активных персонажей нет/)).toBeVisible()
    failed = false
    await user.click(within(screen.getByRole('region', { name: 'Ближайшая сессия' })).getByRole('button'))
    expect(await screen.findByText(/Предстоящих сессий нет/)).toBeVisible()
  })

  it('loads the shared GM schedule past the first page', async () => {
    request.mockImplementation((path, { params }) => Promise.resolve({ items: params.page === 1 ? Array.from({ length: 100 }, (_, i) => session(i, '2099-01-01T00:00:00Z')) : [session(101, '2099-02-01T00:00:00Z')], total: 101 }))
    const { result } = renderHook(() => useTableSchedule(), { wrapper })
    await waitFor(() => expect(result.current.data).toHaveLength(101))
    expect(request).toHaveBeenCalledWith('/campaigns/schedule', { params: { role: 'gm', from: expect.any(String), page: 2, size: 100 } })
    expect(request.mock.calls[0][1].params.from).toBe(request.mock.calls[1][1].params.from)
  })

  it('treats a session scheduled exactly now as upcoming', () => {
    const next = session(7, '2099-01-01T00:00:00Z')
    expect(nextCampaignSession([next], new Date(next.scheduled_at).getTime())).toBe(next)
  })
})
