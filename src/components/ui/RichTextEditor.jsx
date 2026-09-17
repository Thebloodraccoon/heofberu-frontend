import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit } from '@tiptap/extension-table'
import { sanitizeHtml, toEditableHtml } from '@/lib/utils/richText.js'
import { Indent } from './richTextIndent.js'
import { TextArea } from './primitives.jsx'

// Липкое форматирование через абзацы: шаг split в ProseMirror сбрасывает
// storedMarks, поэтому после Enter в конце жирной строки следующий абзац
// начинался бы обычным текстом и жирный пришлось бы включать заново. Перехват
// Enter переносит активные marks на новый абзац (пока GM не отключит формат в
// тулбаре), повторяя semantics команды splitBlockKeepMarks из prosemirror-commands.
const PersistMarksOnEnter = Extension.create({
  name: 'persistMarksOnEnter',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const marks =
          state.storedMarks || (selection.$to.parentOffset > 0 ? selection.$from.marks() : null)
        if (!marks || marks.length === 0) return false
        const ok = editor.commands.splitBlock({ keepMarks: false })
        if (ok) editor.commands.setStoredMarks(marks)
        return ok
      },
    }
  },
})

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      disabled={disabled}
      // Иначе клик по кнопке тулбара снимает фокус/выделение с редактора раньше,
      // чем сработает команда форматирования.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rich-toolbar__btn ${active ? 'rich-toolbar__btn_active' : ''}`}
    >
      {children}
    </button>
  )
}

const ALIGN_OPTIONS = [
  ['left', 'По левому краю', 'Л'],
  ['center', 'По центру', 'Ц'],
  ['right', 'По правому краю', 'П'],
  ['justify', 'По ширине', 'Ш'],
]

// Замена обычной <textarea> для «прозных» полей (описания, предыстория, заметки):
// панель форматирования + переключатель «Показать код» для правки сырого HTML.
// Контракт совместим со старым TextArea: value/onChange({ target: { value } }).
export function RichTextEditor({
  value = '',
  onChange,
  placeholder,
  rows = 4,
  className = '',
  disabled = false,
  autoFocus = false,
  ariaLabel,
}) {
  const [showCode, setShowCode] = useState(false)
  const [sourceDraft, setSourceDraft] = useState('')

  const editor = useEditor({
    extensions: [
      PersistMarksOnEnter,
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Indent,
      TableKit.configure({ table: { resizable: false } }),
    ],
    // Санитизируем даже начальный контент: значение может прийти из БД в обход
    // клиента (старые записи, прямые правки, будущий баг в другом месте), а
    // Tiptap иначе отрендерит его as-is в DOM редактора ещё до первого onUpdate.
    content: sanitizeHtml(toEditableHtml(value)),
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: ed }) => {
      const next = sanitizeHtml(ed.getHTML())
      lastReported.current = next
      onChange?.({ target: { value: next } })
    },
    editorProps: {
      attributes: {
        class: 'rich-text rich-editor__content',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
  })

  // Синхронизируем внешние изменения value (сброс формы, загрузка другой записи),
  // но только когда контент реально другой — иначе курсор будет прыгать при вводе.
  // Сравниваем с последним значением, которое редактор сам отдал наружу (lastReported):
  // родитель почти всегда возвращает его как есть, а прямое сравнение с
  // editor.getHTML() давало ложное расхождение на таблицах — санитайзер вырезает
  // их colgroup/col, и каждый ввод символа перезагружал весь документ (курсор
  // улетал в конец таблицы). Пропускаем самый первый прогон: на монтировании
  // контент уже равен value, а ProseMirror нормализует пустую строку в "<p></p>",
  // что дало бы ложное расхождение.
  const skipNextSync = useRef(true)
  const lastReported = useRef(null)
  useEffect(() => {
    if (!editor) return
    if (skipNextSync.current) {
      skipNextSync.current = false
      return
    }
    if (lastReported.current !== null && value === lastReported.current) return
    const next = sanitizeHtml(toEditableHtml(value))
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => {
    // Второй аргумент — emitUpdate: без false он по умолчанию шлёт событие
    // update (и значит, onChange) сразу при монтировании.
    editor?.setEditable(!disabled, false)
  }, [disabled, editor])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('Ссылка (пусто — убрать):', prev)
    if (url === null) return
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const openSource = () => {
    setSourceDraft(editor.getHTML())
    setShowCode(true)
  }

  const applySource = () => {
    const clean = sanitizeHtml(sourceDraft)
    // emitUpdate: true (по умолчанию) — контент проходит через onUpdate, который
    // один-единственный отвечает за lastReported/onChange, иначе синк-эффект
    // выше посчитает это внешним изменением и передёрнет курсор.
    editor.commands.setContent(clean, { emitUpdate: true })
    setShowCode(false)
  }

  return (
    <div className={`rich-editor ${disabled ? 'rich-editor_disabled' : ''} ${className}`}>
      <div className="rich-toolbar" role="toolbar" aria-label="Форматирование текста">
        <ToolbarButton title="Жирный" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>Ж</b>
        </ToolbarButton>
        <ToolbarButton title="Курсив" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>К</i>
        </ToolbarButton>
        <ToolbarButton title="Подчёркнутый" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>Ч</u>
        </ToolbarButton>
        <ToolbarButton title="Зачёркнутый" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>С</s>
        </ToolbarButton>
        <span className="rich-toolbar__sep" aria-hidden="true" />
        <ToolbarButton title="Заголовок" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Подзаголовок" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToolbarButton>
        <span className="rich-toolbar__sep" aria-hidden="true" />
        <ToolbarButton title="Маркированный список" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          ☰
        </ToolbarButton>
        <ToolbarButton title="Нумерованный список" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </ToolbarButton>
        <ToolbarButton title="Цитата" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          &ldquo;&rdquo;
        </ToolbarButton>
        <ToolbarButton title="Ссылка" active={editor.isActive('link')} onClick={setLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton title="Разделитель" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          ―
        </ToolbarButton>
        <span className="rich-toolbar__sep" aria-hidden="true" />
        {ALIGN_OPTIONS.map(([value, title, label]) => (
          <ToolbarButton
            key={value}
            title={title}
            active={editor.isActive({ textAlign: value })}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
          >
            {label}
          </ToolbarButton>
        ))}
        <span className="rich-toolbar__sep" aria-hidden="true" />
        <ToolbarButton title="Уменьшить отступ" disabled={!editor.can().outdent()} onClick={() => editor.chain().focus().outdent().run()}>
          ⇤
        </ToolbarButton>
        <ToolbarButton title="Увеличить отступ" disabled={!editor.can().indent()} onClick={() => editor.chain().focus().indent().run()}>
          ⇥
        </ToolbarButton>
        <span className="rich-toolbar__sep" aria-hidden="true" />
        <ToolbarButton
          title="Вставить таблицу"
          active={editor.isActive('table')}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          ⊞
        </ToolbarButton>
        {editor.isActive('table') && (
          <>
            <ToolbarButton title="Добавить строку" onClick={() => editor.chain().focus().addRowAfter().run()}>
              +Р
            </ToolbarButton>
            <ToolbarButton title="Добавить столбец" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              +К
            </ToolbarButton>
            <ToolbarButton title="Удалить строку" onClick={() => editor.chain().focus().deleteRow().run()}>
              −Р
            </ToolbarButton>
            <ToolbarButton title="Удалить столбец" onClick={() => editor.chain().focus().deleteColumn().run()}>
              −К
            </ToolbarButton>
            <ToolbarButton title="Удалить таблицу" onClick={() => editor.chain().focus().deleteTable().run()}>
              ✕
            </ToolbarButton>
          </>
        )}
        <span className="rich-toolbar__spacer" />
        <ToolbarButton title={showCode ? 'Скрыть код' : 'Показать код'} active={showCode} onClick={() => (showCode ? setShowCode(false) : openSource())}>
          {'</>'}
        </ToolbarButton>
      </div>
      {showCode ? (
        <div className="rich-editor__source">
          <TextArea
            value={sourceDraft}
            onChange={(e) => setSourceDraft(e.target.value)}
            rows={Math.max(4, rows)}
            className="w-full border-0 bg-stone-900/80 px-3 py-2 font-mono text-xs text-stone-200 outline-none"
          />
          <div className="flex items-center gap-2 border-t border-stone-700/60 bg-stone-900/60 px-2 py-1.5">
            <button type="button" className="sheet-btn sheet-btn_primary" onClick={applySource}>
              Применить
            </button>
            <button type="button" className="sheet-btn" onClick={() => setShowCode(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <EditorContent editor={editor} style={{ minHeight: `${Math.max(3, rows) * 1.6}em` }} />
      )}
    </div>
  )
}

export default RichTextEditor
