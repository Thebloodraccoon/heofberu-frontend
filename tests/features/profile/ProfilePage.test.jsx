import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from '@/features/profile/pages/ProfilePage.jsx'

const mocks = vi.hoisted(() => ({ save: vi.fn(), load: vi.fn() }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => ({ user: { username: 'Астра', email: 'astra@example.com', phone: '', bio: '', discord: '', telegram: '' }, isGM: true, loadUser: mocks.load }) }))
vi.mock('@/features/users/queries.js', () => ({ useUpdateMe: () => ({ mutateAsync: mocks.save, isPending: false }) }))

beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({}) })

describe('ProfilePage', () => {
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
