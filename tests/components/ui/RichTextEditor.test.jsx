import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('toggles underline on the selected text', async () => {
    const onChange = vi.fn()
    render(<RichTextEditor value="текст" onChange={onChange} ariaLabel="Поле" />)
    const editor = screen.getByRole('textbox', { name: 'Поле' })
    await userEvent.click(editor)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByTitle('Подчёркнутый'))
    expect(onChange).toHaveBeenLastCalledWith({ target: { value: '++текст++' } })
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

  // Регрессия: под StrictMode Tiptap пересоздаёт редактор, и родитель держал ссылку
  // на уничтоженный экземпляр — «В текст» в конструкторе статей молча не работал.
  it('hands the parent a live editor under StrictMode, so external inserts work', async () => {
    const onChange = vi.fn()
    let latest = null
    render(
      <StrictMode>
        <RichTextEditor value="Текст" onChange={onChange} onEditor={(ed) => (latest = ed)} ariaLabel="Поле" />
      </StrictMode>,
    )
    await waitFor(() => expect(latest).not.toBeNull())
    expect(latest.isDestroyed).toBe(false)

    act(() => {
      latest
        .chain()
        .focus('end')
        .insertContent({ type: 'image', attrs: { src: 'https://cdn.example/a.png', alt: '' } })
        .run()
    })
    expect(onChange.mock.lastCall[0].target.value).toContain('![](https://cdn.example/a.png)')
  })

  it('delegates the image button to onPickImage when given', async () => {
    const onPickImage = vi.fn()
    render(<RichTextEditor value="" onChange={vi.fn()} allowImages onPickImage={onPickImage} ariaLabel="Поле" />)
    await userEvent.click(screen.getByTitle('Вставить картинку: уже загруженную или новую'))
    expect(onPickImage).toHaveBeenCalledTimes(1)
  })
})
