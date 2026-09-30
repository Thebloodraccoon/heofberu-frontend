import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TextField from '@/components/ui/TextField.jsx'

describe('TextField save feedback', () => {
  it('shows local progress, blocks duplicate saves, and confirms success', async () => {
    let resolve
    const onSave = vi.fn(() => new Promise((done) => { resolve = done }))
    const user = userEvent.setup()
    render(<TextField label="Название" value="Статья" onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(onSave).toHaveBeenCalledTimes(1)
    await act(async () => resolve())
    expect(screen.getByText('Сохранено')).toBeVisible()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('retains the draft after failure and retries the same change', async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error('Нет связи')).mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<TextField label="Название" value="Статья" onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'Новое название')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Нет связи')
    expect(screen.getByRole('textbox')).toHaveValue('Новое название')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onSave).toHaveBeenLastCalledWith('Новое название')
    expect(screen.getByText('Сохранено')).toBeVisible()
  })
})
