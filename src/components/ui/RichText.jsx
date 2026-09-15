import { sanitizeHtml, toEditableHtml } from '@/lib/utils/richText.js'

// Безопасный рендер контента из RichTextEditor: принимает как новый HTML, так и
// старые записи в виде обычного текста (см. toEditableHtml) — санитизирует и
// показывает единым образом, чтобы не хранить два разных пути отображения.
// tail — доп. текст (например, effects_summary с бэка), который дорендеривается
// в конце того же дива — и тоже может прийти как HTML, так и как обычный текст.
export function RichText({ value, className = '', empty = '—', tail }) {
  const bodyHtml = toEditableHtml(value)
  // tail (effects_summary) может прийти как обычный текст, так и с готовой
  // разметкой (<ul><li>…</li></ul>) — тем же путём, что и основное значение,
  // а не escape-ом, иначе теги показывались бы буквально.
  const spacer = tail && bodyHtml ? '<p><br></p>' : ''
  const tailHtml = tail ? spacer + toEditableHtml(tail) : ''
  const html = sanitizeHtml(bodyHtml + tailHtml)
  if (!html) return <p className={className}>{empty}</p>
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export default RichText
