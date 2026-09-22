import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichTextEditor } from '@/components/ui/RichTextEditor.jsx'

// ProseMirror-редактор в jsdom не поддерживает по-символьный ввод (typing)
// надёжно — курсор/selection не синхронизируются как в браузере. Заменяем
// содержимое через paste, который ProseMirror обрабатывает штатно.
const pasteInto = (el, text) =>
  fireEvent.paste(el, { clipboardData: { getData: (type) => (type === 'text/plain' ? text : '') } })

describe('RichTextEditor', () => {
  it('renders the toolbar and existing content', () => {
    render(<RichTextEditor value="Привет" onChange={vi.fn()} ariaLabel="Заметка" />)
    expect(screen.getByRole('toolbar', { name: 'Форматирование текста' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Заметка' })).toHaveTextContent('Привет')
  })

  it('reports edits as Markdown through onChange', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="" onChange={onChange} ariaLabel="Поле" />)
    const editor = screen.getByRole('textbox', { name: 'Поле' })
    await userEvent.click(editor)
    pasteInto(editor, 'Новый текст')
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: 'Новый текст' } })
  })

  it('toggles bold on the selected text', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="текст" onChange={onChange} ariaLabel="Поле" />)
    const editor = screen.getByRole('textbox', { name: 'Поле' })
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByTitle('Жирный'))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '**текст**' } })
  })

  it('loads legacy HTML values and saves them back as Markdown', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="<p><strong>Старый</strong></p>" onChange={onChange} ariaLabel="Поле" />)
    expect(screen.getByRole('textbox', { name: 'Поле' })).toHaveTextContent('Старый')
    await userEvent.click(screen.getByRole('textbox', { name: 'Поле' }))
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByTitle('Курсив'))
    const [[payload]] = onChange.mock.calls.slice(-1)
    expect(payload.target.value).not.toContain('<')
  })

  it('shows Markdown in the source view and applies edits from it', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="**ок**" onChange={onChange} ariaLabel="Поле" />)
    await userEvent.click(screen.getByTitle('Показать код'))
    const source = screen.getByDisplayValue('**ок**')
    await userEvent.clear(source)
    await userEvent.type(source, '# Заголовок', { skipClick: true })
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '# Заголовок' } })
  })

  it('disables the editor when disabled is set', () => {
    render(<RichTextEditor value="x" onChange={vi.fn()} disabled ariaLabel="Поле" />)
    expect(screen.getByRole('textbox', { name: 'Поле' })).toHaveAttribute('contenteditable', 'false')
  })
})
