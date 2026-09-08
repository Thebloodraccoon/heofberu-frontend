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
    render(<RichTextEditor value="<p>Привет</p>" onChange={vi.fn()} ariaLabel="Заметка" />)
    expect(screen.getByRole('toolbar', { name: 'Форматирование текста' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Заметка' })).toHaveTextContent('Привет')
  })

  it('reports edits as HTML through onChange', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="" onChange={onChange} ariaLabel="Поле" />)
    const editor = screen.getByRole('textbox', { name: 'Поле' })
    await userEvent.click(editor)
    pasteInto(editor, 'Новый текст')
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '<p>Новый текст</p>' } })
  })

  it('toggles bold on the selected text', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="<p>текст</p>" onChange={onChange} ariaLabel="Поле" />)
    const editor = screen.getByRole('textbox', { name: 'Поле' })
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByTitle('Жирный'))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '<p><strong>текст</strong></p>' } })
  })

  it('sanitizes dangerous markup entered via the source view', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="<p>ок</p>" onChange={onChange} ariaLabel="Поле" />)
    await userEvent.click(screen.getByTitle('Показать код'))
    const source = screen.getByDisplayValue('<p>ок</p>')
    await userEvent.clear(source)
    await userEvent.type(source, '<img src=x onerror="alert(1)"><p>чисто</p>', { skipClick: true })
    await userEvent.click(screen.getByRole('button', { name: 'Применить' }))
    const [[payload]] = onChange.mock.calls.slice(-1)
    expect(payload.target.value).not.toContain('onerror')
    expect(payload.target.value).not.toContain('<img')
    expect(payload.target.value).toContain('чисто')
  })

  it('disables the editor when disabled is set', () => {
    render(<RichTextEditor value="<p>x</p>" onChange={vi.fn()} disabled ariaLabel="Поле" />)
    expect(screen.getByRole('textbox', { name: 'Поле' })).toHaveAttribute('contenteditable', 'false')
  })
})
