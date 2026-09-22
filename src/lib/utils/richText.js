import DOMPurify from 'dompurify'
import { Marked } from 'marked'

// Разрешённый набор тегов/атрибутов для контента, приходящего из RichTextEditor
// (тексты предысторий, заметок, описаний в справочнике). Общий рендер и для
// нового HTML, и для старых записей с обычным текстом — см. toEditableHtml.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'del', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'a', 'hr', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
]
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'colspan', 'rowspan', 'src', 'alt', 'title', 'start', 'loading']

// style — единственный "открытый" атрибут (нужен для text-align редактора и
// отступов), поэтому вместо ALLOWED_ATTR фильтруем его содержимое построчно:
// пропускаем только конкретные безопасные свойства/значения, всё остальное
// (url(), expression(), произвольный CSS) отбрасывается. Регистрируется один
// раз на общем инстансе DOMPurify, экспортируемом модулем 'dompurify'.
const SAFE_STYLE_DECLARATIONS = [
  [/^text-align$/, /^(left|right|center|justify)$/],
  [/^margin-left$/, /^\d+(\.\d+)?em$/],
  [/^opacity$/, /^(0(\.\d+)?|1)$/],
  [/^font-style$/, /^italic$/],
]
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName !== 'style') return
  const kept = data.attrValue
    .split(';')
    .map((decl) => {
      const i = decl.indexOf(':')
      if (i < 0) return null
      const prop = decl.slice(0, i).trim().toLowerCase()
      const value = decl.slice(i + 1).trim().toLowerCase()
      const ok = SAFE_STYLE_DECLARATIONS.some(([p, v]) => p.test(prop) && v.test(value))
      return ok ? `${prop}: ${value}` : null
    })
    .filter(Boolean)
  data.attrValue = kept.join('; ')
})

// Ссылки открываются в новой вкладке без rel="noopener noreferrer" уязвимы к
// reverse tabnabbing (открытая страница получает доступ к window.opener и может
// подменить исходную вкладку) — форсируем безопасный rel везде, где есть target.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Картинки — только по http(s) или с корня сайта: data:/blob: и прочее не пускаем.
  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src') ?? ''
    if (!/^(https?:\/\/|\/(?!\/))/i.test(src)) node.removeAttribute('src')
    node.setAttribute('loading', 'lazy')
  }
  if (node.tagName === 'A' && node.hasAttribute('target')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

// Маркеры именно нашего старого HTML-формата (редактор до перехода на Markdown).
// Общий "есть угловые скобки" тут не годится: в Markdown легально встречаются
// автоссылки <https://…> и просто "a < b".
const LEGACY_HTML_RE = /<\/?(p|br|strong|em|u|s|h[1-6]|ul|ol|li|blockquote|table|tr|td|th|a|hr)(\s[^>]*)?>/i

export function looksLikeHtml(value) {
  return typeof value === 'string' && LEGACY_HTML_RE.test(value)
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Сырой HTML внутри Markdown не пропускаем вовсе: экранируем как текст. Санитайзер
// остаётся вторым рубежом, а не единственной защитой.
const markdown = new Marked({ gfm: true, breaks: true })
markdown.use({
  renderer: {
    html: ({ text }) => escapeHtml(text),
  },
})

// Единая точка превращения сохранённого значения в безопасный HTML для показа.
// Новые записи — Markdown; старые (HTML от прежнего редактора) рендерим как раньше.
export function renderRichHtml(value) {
  if (!value) return ''
  if (looksLikeHtml(value)) return sanitizeHtml(value)
  return sanitizeHtml(markdown.parse(String(value), { async: false }))
}

// Значение для загрузки в редактор: legacy HTML редактор разбирает как HTML,
// всё остальное — как Markdown. Возвращает { content, contentType }.
export function toEditorContent(value) {
  if (!value) return { content: '', contentType: 'markdown' }
  if (looksLikeHtml(value)) return { content: sanitizeHtml(value), contentType: 'html' }
  return { content: String(value), contentType: 'markdown' }
}

// Пустой узел на краю документа: текст без содержимого (только пробелы) или
// пустой параграф (в т.ч. "<p><br></p>" — так ProseMirror/Tiptap нормализует
// пустую строку). Медиа-элементы (img/hr/table) пустыми не считаем.
function isEdgeNodeEmpty(node) {
  if (node.nodeType === Node.TEXT_NODE) return !node.textContent.trim()
  if (node.nodeType !== Node.ELEMENT_NODE) return true
  if (node.matches?.('img, hr, table') || node.querySelector?.('img, hr, table')) return false
  return !node.textContent.trim()
}

// Срезает пустые параграфы/пробелы в начале и в конце HTML — глобально для
// всех описаний, чтобы редактор не копил случайные пустые строки, которые
// ProseMirror оставляет после Enter в начале/конце текста.
function trimEdges(html) {
  const container = document.createElement('div')
  container.innerHTML = html
  while (container.firstChild && isEdgeNodeEmpty(container.firstChild)) {
    container.removeChild(container.firstChild)
  }
  while (container.lastChild && isEdgeNodeEmpty(container.lastChild)) {
    container.removeChild(container.lastChild)
  }
  return container.innerHTML
}

export function sanitizeHtml(html) {
  if (!html) return ''
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
  return trimEdges(clean)
}

// Для превью в одну-две строки (карточки списков, чипы) — обычный текст без разметки.
export function toPlainText(value) {
  if (!value) return ''
  const div = document.createElement('div')
  div.innerHTML = renderRichHtml(value)
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}
