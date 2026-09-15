import DOMPurify from 'dompurify'

// Разрешённый набор тегов/атрибутов для контента, приходящего из RichTextEditor
// (тексты предысторий, заметок, описаний в справочнике). Общий рендер и для
// нового HTML, и для старых записей с обычным текстом — см. toEditableHtml.
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'blockquote', 'a', 'hr',
  'table', 'tr', 'td', 'th',
]
const ALLOWED_ATTR = ['href', 'target', 'rel', 'style', 'colspan', 'rowspan']

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
  if (node.tagName === 'A' && node.hasAttribute('target')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function looksLikeHtml(value) {
  return typeof value === 'string' && /<\/?[a-z][\s\S]*>/i.test(value)
}

// Старые записи хранятся как обычный текст с переносами строк — оборачиваем их
// в параграфы, чтобы редактор и просмотр показывали то же самое, что и раньше.
export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function toEditableHtml(value) {
  if (!value) return ''
  if (looksLikeHtml(value)) return value
  return String(value)
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
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
  if (!looksLikeHtml(value)) return String(value)
  const div = document.createElement('div')
  div.innerHTML = sanitizeHtml(value)
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim()
}
