import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Markdown } from '@tiptap/markdown'
import { TableKit } from '@tiptap/extension-table'
import { looksLikeHtml as looksLikeLegacy, toEditorContent } from '@/lib/utils/richText.js'
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

const imageFilesOf = (dataTransfer) =>
  Array.from(dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))

// Замена обычной <textarea> для «прозных» полей (описания, предыстория, заметки):
// панель форматирования + переключатель «Показать код» для правки сырого Markdown.
// Хранит и отдаёт Markdown; старые значения-HTML при загрузке разбираются как HTML
// и при первой правке сохраняются уже Markdown-ом.
// Контракт совместим со старым TextArea: value/onChange({ target: { value } }).
// allowImages — картинки разрешены только в редакторе тела статьи; во всех
// остальных полях (описания, предыстории, заметки в справочнике и т.п.) кнопка
// и вставка картинок скрыты по умолчанию.
// onUploadImage(file) => Promise<{ src, alt }> — если задан (и allowImages),
// картинки можно вставить из буфера, перетащить в текст или выбрать кнопкой 🖼:
// файл загружается и вставляется на место курсора/броска. onPickImage(editor) —
// если задан, кнопка 🖼 отдаёт выбор картинки родителю (например, модалка «уже
// загруженные / новая»).
// extraTools — [{ title, label, onClick(editor) }].
export function RichTextEditor({
  value = '',
  onChange,
  placeholder,
  rows = 4,
  className = '',
  disabled = false,
  autoFocus = false,
  ariaLabel,
  onEditor,
  allowImages = false,
  onUploadImage,
  onPickImage,
  extraTools = [],
}) {
  const [showCode, setShowCode] = useState(false)
  const [sourceDraft, setSourceDraft] = useState('')
  const [uploading, setUploading] = useState(0)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)
  // editorProps (paste/drop) создаются один раз вместе с редактором — актуальный
  // обработчик загрузки читаем через ref, а не из замыкания первого рендера.
  const uploadRef = useRef(onUploadImage)
  useEffect(() => {
    uploadRef.current = onUploadImage
  }, [onUploadImage])

  // Загружает файлы по очереди и вставляет каждую картинку в позицию pos (или в
  // текущее выделение). Позицию ограничиваем размером документа: пока шла загрузка,
  // текст могли поправить.
  const uploadAndInsert = async (view, files, pos) => {
    setUploadError(null)
    let at = pos
    for (const file of files) {
      setUploading((n) => n + 1)
      try {
        const { src, alt } = await uploadRef.current(file)
        const { state } = view
        const node = state.schema.nodes.image.create({ src, alt: alt ?? '' })
        const insertAt = Math.min(at ?? state.selection.from, state.doc.content.size)
        view.dispatch(state.tr.insert(insertAt, node))
        at = insertAt + node.nodeSize
      } catch (e) {
        setUploadError(e?.message || 'Не удалось загрузить картинку')
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  const initial = toEditorContent(value)
  const editor = useEditor({
    extensions: [
      PersistMarksOnEnter,
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      Image.configure({ inline: false }),
      Markdown,
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: initial.content,
    contentType: initial.contentType,
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: ed }) => {
      const next = ed.getMarkdown().trim()
      lastReported.current = next
      onChange?.({ target: { value: next } })
    },
    editorProps: {
      handlePaste: (view, event) => {
        const files = imageFilesOf(event.clipboardData)
        if (!allowImages || !uploadRef.current || files.length === 0) return false
        event.preventDefault()
        uploadAndInsert(view, files, null)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        const files = imageFilesOf(event.dataTransfer)
        if (moved || !allowImages || !uploadRef.current || files.length === 0) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null
        uploadAndInsert(view, files, pos)
        return true
      },
      attributes: {
        class: 'rich-text rich-editor__content',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
  })

  // Отдаём наружу текущий экземпляр редактора. Не через onCreate: в StrictMode Tiptap
  // создаёт редактор, уничтожает и создаёт заново — onCreate мог оставить у родителя
  // ссылку на уже уничтоженный экземпляр, и команды (например, «В текст») молча не работали.
  useEffect(() => {
    if (editor && !editor.isDestroyed) onEditor?.(editor)
  }, [editor, onEditor])

  // Синхронизируем внешние изменения value (сброс формы, загрузка другой записи),
  // но только когда контент реально другой — иначе курсор будет прыгать при вводе.
  // Сравниваем с последним значением, которое редактор сам отдал наружу (lastReported):
  // родитель почти всегда возвращает его как есть. Пропускаем самый первый прогон:
  // на монтировании контент уже равен value.
  const skipNextSync = useRef(true)
  const lastReported = useRef(null)
  useEffect(() => {
    if (!editor) return
    if (skipNextSync.current) {
      skipNextSync.current = false
      return
    }
    if (lastReported.current !== null && value === lastReported.current) return
    const next = toEditorContent(value)
    if (looksLikeLegacy(value) || next.content !== editor.getMarkdown().trim()) {
      editor.commands.setContent(next.content, { emitUpdate: false, contentType: next.contentType })
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
    setSourceDraft(editor.getMarkdown())
    setShowCode(true)
  }

  const applySource = () => {
    // emitUpdate: true (по умолчанию) — контент проходит через onUpdate, который
    // один-единственный отвечает за lastReported/onChange, иначе синк-эффект
    // выше посчитает это внешним изменением и передёрнет курсор.
    editor.commands.setContent(sourceDraft, { emitUpdate: true, contentType: 'markdown' })
    setShowCode(false)
  }

  const setImage = () => {
    if (!allowImages) return
    if (onPickImage) {
      onPickImage(editor)
      return
    }
    if (onUploadImage) {
      fileInputRef.current?.click()
      return
    }
    const url = window.prompt('Адрес картинки (https://…):', '')
    if (!url?.trim()) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  const pickFiles = (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length) uploadAndInsert(editor.view, files, null)
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
        <ToolbarButton title="Зачёркнутый" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>С</s>
        </ToolbarButton>
        <ToolbarButton title="Подчёркнутый" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>Ч</u>
        </ToolbarButton>
        <span className="rich-toolbar__sep" aria-hidden="true" />
        {[1, 2, 3, 4].map((level) => (
          <ToolbarButton
            key={level}
            title={`Заголовок ${level}`}
            active={editor.isActive('heading', { level })}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          >
            H{level}
          </ToolbarButton>
        ))}
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
        {allowImages && (
          <ToolbarButton
            title={
              onPickImage
                ? 'Вставить картинку: уже загруженную или новую'
                : onUploadImage
                  ? 'Картинка с компьютера (можно и перетащить/вставить в текст)'
                  : 'Картинка по ссылке'
            }
            disabled={uploading > 0}
            onClick={setImage}
          >
            {uploading > 0 ? '⏳' : '🖼'}
          </ToolbarButton>
        )}
        {allowImages && onUploadImage && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={pickFiles}
          />
        )}
        {extraTools.map((tool) => (
          <ToolbarButton key={tool.title} title={tool.title} onClick={() => tool.onClick(editor)}>
            {tool.label}
          </ToolbarButton>
        ))}
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
      {(uploading > 0 || uploadError) && (
        <div className="border-t border-stone-700/60 px-3 py-1.5 text-xs" role="status">
          {uploading > 0 && <span className="text-stone-400">Загружаем картинки… ({uploading})</span>}
          {uploadError && (
            <span className="text-red-300">
              {uploadError}{' '}
              <button type="button" className="underline" onClick={() => setUploadError(null)}>
                скрыть
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default RichTextEditor
