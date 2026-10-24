import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionFormDrawer from '@/features/campaigns/components/SessionFormDrawer.jsx'

const state = vi.hoisted(() => ({ save: vi.fn(), attendance: vi.fn(), roster: [], rosterLoading: false, rosterError: null, refetch: vi.fn() }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: vi.fn() }) }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange, ariaLabel, disabled }) => <textarea aria-label={ariaLabel} value={value} disabled={disabled} onChange={onChange} /> }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useSaveSession: () => ({ mutateAsync: state.save, isPending: false }),
  useSetAttendance: () => ({ mutateAsync: state.attendance, isPending: false }),
  useFullRoster: () => ({ data: state.roster, isLoading: state.rosterLoading, error: state.rosterError, refetch: state.refetch }),
}))

const campaign = { id: 1, title: 'Нова', viewer_role: 'gm' }
const existingSession = { id: 3, number: 2, title: '', status: 'played', scheduled_at: null, chronicle_markdown: '', attendees: [{ participation_id: 11, character_name: 'Гурн', owner: { username: 'Ария' } }] }
function setup(props = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const result = render(<SessionFormDrawer campaign={campaign} onClose={onClose} onSaved={onSaved} {...props} />)
  return { ...result, onClose, onSaved, user: userEvent.setup() }
}

describe('session form', () => {
  beforeEach(() => {
    state.save.mockReset().mockResolvedValue({ id: 3, number: 1 })
    state.attendance.mockReset().mockResolvedValue({})
    state.roster = [
      { id: 11, status: 'active', owner: { username: 'Ария' }, character: { id: 42, name: 'Гурн', level: 3, class_name: 'воин' } },
      { id: 12, status: 'dead', owner: { username: 'Бран' }, character: { id: 43, name: 'Илса', level: 2, class_name: 'жрец' } },
    ]
    state.rosterLoading = false
    state.rosterError = null
  })

  it('creates a session with the time in UTC and then saves who attended', async () => {
    const { user, onSaved } = setup()
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Маяк')
    await user.click(screen.getByRole('button', { name: 'Дата и время', exact: true }))
    const calendar = within(screen.getByRole('dialog', { name: 'Дата и время', exact: true }))
    await user.click(calendar.getByRole('button', { name: 'Выбрать месяц и год' }))
    await user.clear(calendar.getByRole('textbox', { name: 'Год' }))
    await user.type(calendar.getByRole('textbox', { name: 'Год' }), '2099')
    await user.click(calendar.getByRole('button', { name: 'Январь', exact: true }))
    await user.click(calendar.getByRole('button', { name: /10 января 2099/ }))
    await user.clear(calendar.getByRole('textbox', { name: 'Часы' }))
    await user.type(calendar.getByRole('textbox', { name: 'Часы' }), '21')
    await user.click(calendar.getByRole('button', { name: 'Применить' }))
    expect(state.save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Илса/ }))
    expect(screen.getByText('@Ария')).toBeVisible()
    expect(state.save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))

    const body = state.save.mock.calls[0][0]
    expect(body).toMatchObject({ title: 'Маяк', status: 'planned' })
    expect(body.number).toBeUndefined()
    expect(new Date(body.scheduled_at).getTime()).toBe(new Date(2099, 0, 10, 21, 0).getTime())
    // Посещаемость пишется после сохранения сессии — по её id из ответа.
    await waitFor(() => expect(state.attendance).toHaveBeenCalledWith({ sessionId: 3, participationIds: [12] }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 3, number: 1 }))
  })

  it('does not touch attendance when it did not change and rejects a bad number', async () => {
    const { user } = setup({ session: existingSession })
    expect(screen.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Дополнительные параметры/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Номер' }), { target: { value: '0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Номер — целое число от 1.')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Номер' }), { target: { value: '2' } })
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Маяк')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 3, number: 2, scheduled_at: null }))
    expect(state.attendance).not.toHaveBeenCalled()
  })

  it('keeps numbering, status and the chronicle collapsed when creating and can close an untouched form', async () => {
    const { user, onClose } = setup()
    expect(screen.getByText('Дата не назначена. Можно добавить позже.')).toBeVisible()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Хроника сессии' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('status')).getByText('Запланирована')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.save).not.toHaveBeenCalled()
  })

  it('discards calendar changes on Escape without closing or dirtying the session form', async () => {
    const { user, onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Дата и время', exact: true }))
    await user.click(screen.getByRole('button', { name: 'Сегодня', exact: true }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Новая сессия' })).toBeVisible()
    expect(screen.queryByRole('dialog', { name: 'Дата и время', exact: true })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.save).not.toHaveBeenCalled()
  })

  it('creates an unnamed and undated session using the next automatic number', async () => {
    const { user, onSaved } = setup()
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    expect(state.save).toHaveBeenCalledWith({ title: '', status: 'planned', scheduled_at: null, chronicle_markdown: '' })
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(state.attendance).not.toHaveBeenCalled()
  })

  it('preserves chronicle text when collapsing it and supports manual numbering and status', async () => {
    const { user } = setup()
    const chronicle = screen.getByRole('button', { name: /^Хроника/ })
    await user.click(chronicle)
    await user.type(screen.getByRole('textbox', { name: 'Хроника сессии' }), 'Герои нашли маяк.')
    await user.click(chronicle)
    await user.click(screen.getByRole('button', { name: /Дополнительные параметры/ }))
    await user.type(screen.getByRole('spinbutton', { name: 'Номер' }), '7')
    await user.click(screen.getByRole('button', { name: 'Статус' }))
    await user.click(screen.getByRole('option', { name: 'Сыграна' }))
    expect(screen.getByRole('heading', { name: 'Кто присутствовал' })).toBeVisible()
    await user.click(chronicle)
    expect(screen.getByRole('textbox', { name: 'Хроника сессии' })).toHaveValue('Герои нашли маяк.')
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ number: 7, status: 'played', chronicle_markdown: 'Герои нашли маяк.' }))
  })

  it.each(['escape', 'close', 'cancel', 'overlay'])('protects unsaved text when closing via %s', async (method) => {
    const { user, onClose } = setup()
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Несохранённая сессия')
    if (method === 'escape') await user.keyboard('{Escape}')
    else if (method === 'overlay') fireEvent.click(document.querySelector('.ui-drawer-overlay'))
    else await user.click(screen.getByRole('button', { name: method === 'close' ? 'Закрыть форму сессии' : 'Отмена' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Остаться' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Название' })).toHaveValue('Несохранённая сессия')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Не сохранять' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.save).not.toHaveBeenCalled()
  })

  it('updates attendance alone when the session fields have not changed', async () => {
    const { user, onSaved } = setup({ session: existingSession })
    await user.click(screen.getByRole('button', { name: /Илса/ }))
    await user.click(screen.getByRole('button', { name: 'Сохранить', exact: true }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(existingSession))
    expect(state.save).not.toHaveBeenCalled()
    expect(state.attendance).toHaveBeenCalledWith({ sessionId: 3, participationIds: [11, 12] })
  })

  it('retries attendance without creating another session after a partial failure', async () => {
    state.attendance.mockRejectedValueOnce(new Error('Нет соединения'))
    const { user, onSaved } = setup()
    await user.click(screen.getByRole('button', { name: /Гурн/ }))
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    expect(await screen.findByText(/Сессия №1 сохранена, но участники не сохранены/)).toBeVisible()
    expect(screen.getByRole('button', { name: /Гурн/ })).toHaveAttribute('aria-pressed', 'true')
    expect(onSaved).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(state.save).toHaveBeenCalledTimes(1)
    expect(state.attendance).toHaveBeenCalledTimes(2)
    expect(state.attendance).toHaveBeenLastCalledWith({ sessionId: 3, participationIds: [11] })
  })

  it('updates the created session rather than duplicating it when the draft is changed after an attendance error', async () => {
    state.attendance.mockRejectedValueOnce(new Error('Нет соединения'))
    const { user, onSaved } = setup()
    await user.click(screen.getByRole('button', { name: /Гурн/ }))
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    await screen.findByText('Нет соединения')
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Новое название')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(state.save).toHaveBeenCalledTimes(2)
    expect(state.save).toHaveBeenLastCalledWith(expect.objectContaining({ sessionId: 3, title: 'Новое название' }))
  })

  it('explains that the session already exists when abandoning a partial save', async () => {
    state.attendance.mockRejectedValueOnce(new Error('Нет соединения'))
    const { user, onClose } = setup()
    await user.click(screen.getByRole('button', { name: /Гурн/ }))
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    await screen.findByText('Нет соединения')
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText(/Сессия №1 уже создана/)).toBeVisible()
    await user.click(dialog.getByRole('button', { name: 'Закрыть', exact: true }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.save).toHaveBeenCalledOnce()
  })

  it('preserves the form and retries a failed session write', async () => {
    state.save.mockRejectedValueOnce(new Error('Сервер недоступен'))
    const { user, onSaved } = setup()
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Маяк')
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    expect(await screen.findByText('Сервер недоступен')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Название' })).toHaveValue('Маяк')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(state.save).toHaveBeenCalledTimes(2)
  })

  it('blocks dismissing, editing and repeat submission while saving', async () => {
    let resolve
    state.save.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    const { user, onClose, onSaved } = setup()
    await user.click(screen.getByRole('button', { name: /^Хроника/ }))
    await user.click(screen.getByRole('button', { name: 'Создать сессию' }))
    expect(screen.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
    const input = screen.getByRole('textbox', { name: 'Название' })
    expect(input).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Хроника сессии' })).toBeDisabled()
    fireEvent.submit(input.closest('form'))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Закрыть форму сессии' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(state.save).toHaveBeenCalledOnce()
    await act(async () => resolve({ id: 3, number: 1 }))
    expect(onSaved).toHaveBeenCalledOnce()
  })

  it('distinguishes roster loading, retryable errors and empty results', async () => {
    state.rosterLoading = true
    const { user, rerender } = setup()
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    state.rosterLoading = false
    state.rosterError = new Error('Не удалось загрузить состав')
    rerender(<SessionFormDrawer campaign={campaign} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(state.refetch).toHaveBeenCalledOnce()
    state.rosterError = null
    state.roster = []
    rerender(<SessionFormDrawer campaign={campaign} onClose={vi.fn()} />)
    expect(screen.getByText(/В кампании пока нет персонажей/)).toBeVisible()
  })

  it('retains attendees who are absent from the current roster', async () => {
    state.roster = []
    const { user } = setup({ session: existingSession })
    const historic = screen.getByRole('button', { name: /Гурн/ })
    expect(historic).toHaveAttribute('aria-pressed', 'true')
    expect(historic).toHaveTextContent('Нет в текущем составе')
    await user.click(historic)
    await user.click(screen.getByRole('button', { name: 'Сохранить', exact: true }))
    expect(state.attendance).toHaveBeenCalledWith({ sessionId: 3, participationIds: [] })
    expect(state.save).not.toHaveBeenCalled()
  })

  it('keeps deletion in the same drawer and confirms the loss of draft changes', async () => {
    const run = vi.fn()
    const { user } = setup({ session: existingSession, deleteAction: { run } })
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Правка')
    await user.click(screen.getByRole('button', { name: 'Удалить сессию', exact: true }))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Удалить сессию?' }))
    expect(dialog.getByText(/Несохранённые изменения будут отменены/)).toBeVisible()
    expect(run).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('textbox', { name: 'Название' })).toHaveValue('Правка')
    await user.click(screen.getByRole('button', { name: 'Удалить сессию', exact: true }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Удалить сессию', exact: true }))
    expect(run).toHaveBeenCalledOnce()
    expect(state.save).not.toHaveBeenCalled()
  })
})
