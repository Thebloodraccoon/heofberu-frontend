import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SessionPage from '@/features/campaigns/pages/SessionPage.jsx'

const state = vi.hoisted(() => ({ role: 'player', published: true, status: 'played', attendance: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/features/campaigns/components/SessionReviews.jsx', () => ({ default: () => <p>Отзывы стола</p> }))
vi.mock('@/features/campaigns/components/GmPanelDrawer.jsx', () => ({ default: ({ name }) => <div>ГМ-панель: {name}</div> }))
vi.mock('@/features/characters/queries.js', () => ({ useCharacter: () => ({ data: { current_hp: 7, max_hp: 12, temp_hp: 0 }, isLoading: false }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCampaign: () => ({ data: { id: 1, title: 'Нова', viewer_role: state.role }, isLoading: false }),
  useSession: () => ({ data: {
    id: 7, number: 4, title: 'Маяк', status: state.status, scheduled_at: '2026-10-10T19:00:00Z', published_at: state.published ? '2026-10-11T10:00:00Z' : null,
    chronicle_markdown: state.published ? 'Герои **поднялись** на маяк.' : null, attendees: [{ participation_id: 11, character_name: 'Гурн', owner: { username: 'Ария' } }],
  }, isLoading: false }),
  usePublishSession: () => ({ mutate: vi.fn() }),
  useDeleteSession: () => ({ mutate: vi.fn(), reset: vi.fn() }),
  useSetAttendance: () => ({ mutate: state.attendance, isPending: false }),
  useFullRoster: () => ({ data: [
    { id: 11, status: 'active', owner: { username: 'Ария' }, character: { id: 42, name: 'Гурн', level: 3, class_name: 'воин' } },
    { id: 12, status: 'active', owner: { username: 'Бран' }, character: { id: 43, name: 'Сив', level: 3, class_name: 'жрец' } },
  ], isLoading: false }),
}))

function setup() {
  render(<MemoryRouter initialEntries={['/campaigns/1/sessions/7']}><Routes><Route path="/campaigns/:id/sessions/:sessionId" element={<SessionPage />} /></Routes></MemoryRouter>)
}

describe('session page', () => {
  it('shows a player when and how it went: chronicle, attendees and reviews, without GM actions', () => {
    state.role = 'player'; state.published = true; state.status = 'played'
    setup()
    expect(screen.getByRole('heading', { name: 'Маяк' })).toBeVisible()
    expect(screen.getByText('поднялись')).toBeVisible()
    expect(screen.getByText('Гурн')).toBeVisible()
    expect(screen.getByText('Отзывы стола')).toBeVisible()
    expect(screen.getByRole('link', { name: /Нова/ })).toHaveAttribute('href', '/campaigns/1?tab=sessions')
    expect(screen.queryByRole('button', { name: /Настройки/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Персонажи сессии' })).not.toBeInTheDocument()
  })

  it('gives the GM edit and publish actions; reviews wait until the session is played', () => {
    state.role = 'gm'; state.published = false; state.status = 'planned'
    setup()
    expect(screen.getByRole('region', { name: 'Персонажи сессии' })).toHaveTextContent('7/12')
    expect(screen.getByRole('button', { name: /Опубликовать/ })).toBeVisible()
    expect(screen.getByText('Отзывы откроются после сессии.')).toBeVisible()
    expect(screen.queryByText('Отзывы стола')).not.toBeInTheDocument()
  })

  it('opens reviews once the session is played, even before the chronicle', () => {
    state.role = 'player'; state.published = false; state.status = 'played'
    setup()
    expect(screen.getByText('Отзывы стола')).toBeVisible()
  })

  it('lets the GM mark attendance in place and quick-edit a character', async () => {
    state.role = 'gm'; state.published = true; state.status = 'played'
    setup()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Отметить' }))
    await user.click(screen.getByRole('button', { name: 'Сив' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(state.attendance).toHaveBeenCalledWith({ sessionId: 7, participationIds: [11, 12] }, expect.any(Object))
    await user.click(screen.getAllByRole('button', { name: /Быстрая правка/ })[0])
    expect(screen.getByText('ГМ-панель: Гурн')).toBeVisible()
  })
})
