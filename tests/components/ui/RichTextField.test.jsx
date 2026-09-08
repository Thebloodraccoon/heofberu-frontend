import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextField } from '@/components/ui/RichTextField.jsx'

const pasteInto = (el, text) =>
  fireEvent.paste(el, { clipboardData: { getData: (type) => (type === 'text/plain' ? text : '') } })

describe('RichTextField', () => {
  it('shows the current value and an edit affordance', () => {
    render(<RichTextField label="Описание" value="<p>Старый текст</p>" onSave={vi.fn()} />)
    expect(screen.getByText('Описание')).toBeInTheDocument()
    expect(screen.getByText('Старый текст')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('saves only this field and shows a saved confirmation', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<RichTextField label="Описание" value="<p>Старый</p>" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const editor = screen.getByRole('textbox')
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    pasteInto(editor, 'Новый')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onSave).toHaveBeenCalledWith('<p>Новый</p>')
    expect(await screen.findByText('Сохранено')).toBeInTheDocument()
  })

  it('cancels without calling onSave', async () => {
    const onSave = vi.fn()
    render(<RichTextField label="Описание" value="<p>Старый</p>" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const editor = screen.getByRole('textbox')
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    pasteInto(editor, 'Черновик')
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Старый')).toBeInTheDocument()
  })

  it('shows an error and stays in edit mode when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Сеть недоступна'))
    render(<RichTextField label="Описание" value="<p>Старый</p>" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Сеть недоступна')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })
})
