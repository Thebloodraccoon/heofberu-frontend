import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from '@/features/profile/pages/ProfilePage.jsx'

const mocks = vi.hoisted(() => ({ save: vi.fn(), load: vi.fn(), username: 'Астра' }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { username: mocks.username, email: 'astra@example.com', phone: '', bio: '', discord: '', telegram: '' }, isGM: true, loadUser: mocks.load }) }))
vi.mock('@/features/users/queries.js', () => ({ useUpdateMe: () => ({ mutateAsync: mocks.save, isPending: false }) }))

beforeEach(() => { mocks.username = 'Астра'; vi.clearAllMocks(); mocks.load.mockReset(); mocks.save.mockResolvedValue({}) })

describe('ProfilePage', () => {
  it.each(['Ая', 'a'.repeat(33), 'Имя с пробелом', 'name@', '名字'])('rejects invalid nickname %s', async (nickname) => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    fireEvent.change(screen.getByLabelText('Ник'), { target: { value: nickname } })
    expect(screen.getByLabelText('Ник')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('form', { name: 'Профиль' }))
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each(['Ab3', 'a'.repeat(32), 'Їжак_Ёж-7'])('saves valid nickname %s', async (nickname) => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    fireEvent.change(screen.getByLabelText('Ник'), { target: { value: nickname } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ username: nickname })))
    expect(mocks.load).toHaveBeenCalledTimes(2)
  })

  it('updates the displayed nickname and initials from the refreshed account', async () => {
    const user = userEvent.setup()
    const view = render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    fireEvent.change(screen.getByLabelText('Ник'), { target: { value: 'Їжак' } })
    mocks.load.mockImplementation(async () => { mocks.username = 'Їжак' })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(screen.queryByLabelText('Ник')).not.toBeInTheDocument())
    view.rerender(<ProfilePage />)
    expect(screen.getByRole('heading', { name: 'Їжак' })).toBeVisible()
    expect(view.container.querySelector('.profile-avatar')).toHaveTextContent('ЇЖ')
  })

  it('restores the nickname on cancel and keeps it after a server rejection', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    fireEvent.change(screen.getByLabelText('Ник'), { target: { value: 'Новый_ник' } })
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByLabelText('Ник')).toHaveValue('Астра')
    mocks.save.mockRejectedValueOnce(new Error('Это имя уже занято'))
    fireEvent.change(screen.getByLabelText('Ник'), { target: { value: 'Занятый' } })
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Это имя уже занято')
    expect(screen.getByLabelText('Ник')).toHaveValue('Занятый')
  })

  it('saves changed contacts and keeps account fields in the request', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    expect(screen.getByRole('heading', { name: 'Учётная запись' })).toBeVisible()
    expect(screen.queryByLabelText('Телефон')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    await user.type(screen.getByLabelText('Телефон'), '+380123456789')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ username: 'Астра', email: 'astra@example.com', phone: '+380123456789' })))
    expect(await screen.findByText('Сохранено')).toBeVisible()
  })

  it('discards edits on cancel and keeps the form after a save error', async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    await user.type(screen.getByLabelText('Discord'), 'changed')
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(mocks.save).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Редактировать' }))
    expect(screen.getByLabelText('Discord')).toHaveValue('')
    mocks.save.mockRejectedValueOnce(new Error('Ошибка сохранения'))
    await user.type(screen.getByLabelText('Discord'), 'astra')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ошибка сохранения')
    expect(screen.getByLabelText('Discord')).toHaveValue('astra')
  })
})
