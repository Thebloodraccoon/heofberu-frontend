import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionFormDrawer from '@/features/campaigns/components/SessionFormDrawer.jsx'

const state = vi.hoisted(() => ({ save: vi.fn(), attendance: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange, ariaLabel }) => <textarea aria-label={ariaLabel} value={value} onChange={onChange} /> }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useSaveSession: () => ({ mutateAsync: state.save, isPending: false }),
  useSetAttendance: () => ({ mutateAsync: state.attendance, isPending: false }),
  useFullRoster: () => ({ data: [
    { id: 11, status: 'active', character: { id: 42, name: 'Гурн' } },
    { id: 12, status: 'dead', character: { id: 43, name: 'Илса' } },
  ], isLoading: false }),
}))

const campaign = { id: 1, title: 'Нова', viewer_role: 'gm' }

describe('session form', () => {
  beforeEach(() => {
    state.save.mockReset().mockResolvedValue({ id: 3, number: 1 })
    state.attendance.mockReset().mockResolvedValue({})
  })

  it('creates a session with the time in UTC and then saves who attended', async () => {
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<SessionFormDrawer campaign={campaign} onClose={vi.fn()} onSaved={onSaved} />)
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Маяк')
    fireEvent.change(screen.getByLabelText('Дата и время'), { target: { value: '2099-01-10T21:00' } })
    await user.click(screen.getByRole('button', { name: /Илса/ }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const body = state.save.mock.calls[0][0]
    expect(body).toMatchObject({ title: 'Маяк', status: 'planned' })
    expect(body.number).toBeUndefined()
    expect(new Date(body.scheduled_at).getTime()).toBe(new Date(2099, 0, 10, 21, 0).getTime())
    // Посещаемость пишется после сохранения сессии — по её id из ответа.
    await waitFor(() => expect(state.attendance).toHaveBeenCalledWith({ sessionId: 3, participationIds: [12] }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 3, number: 1 }))
  })

  it('does not touch attendance when it did not change and rejects a bad number', async () => {
    const user = userEvent.setup()
    const session = { id: 3, number: 2, title: '', status: 'played', scheduled_at: null, chronicle_markdown: '', attendees: [{ participation_id: 11 }] }
    render(<SessionFormDrawer campaign={campaign} session={session} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Номер' }), { target: { value: '0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Номер — целое число от 1.')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Номер' }), { target: { value: '2' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 3, number: 2, scheduled_at: null }))
    expect(state.attendance).not.toHaveBeenCalled()
  })
})
