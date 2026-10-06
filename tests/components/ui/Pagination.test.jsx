import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Pagination from '@/components/ui/Pagination.jsx'

describe('Pagination', () => {
  it('navigates to adjacent and boundary pages', async () => {
    const onPage = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={3} total={250} size={50} onPage={onPage} />)

    await user.click(screen.getByRole('button', { name: 'Первая страница' }))
    await user.click(screen.getByRole('button', { name: 'Предыдущая страница' }))
    await user.click(screen.getByRole('button', { name: 'Следующая страница' }))
    await user.click(screen.getByRole('button', { name: 'Последняя страница' }))

    expect(onPage.mock.calls).toEqual([[1], [2], [4], [5]])
  })

  it('disables navigation beyond the first and last pages', () => {
    const onPage = vi.fn()
    const { rerender } = render(<Pagination page={1} total={250} size={50} onPage={onPage} />)

    expect(screen.getByRole('button', { name: 'Первая страница' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Предыдущая страница' })).toBeDisabled()
    rerender(<Pagination page={5} total={250} size={50} onPage={onPage} />)
    expect(screen.getByRole('button', { name: 'Следующая страница' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Последняя страница' })).toBeDisabled()
  })
})
