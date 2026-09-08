import { sanitizeHtml, toEditableHtml } from '@/lib/utils/richText.js'

// Безопасный рендер контента из RichTextEditor: принимает как новый HTML, так и
// старые записи в виде обычного текста (см. toEditableHtml) — санитизирует и
// показывает единым образом, чтобы не хранить два разных пути отображения.
export function RichText({ value, className = '', empty = '—' }) {
  const html = sanitizeHtml(toEditableHtml(value))
  if (!html) return <p className={className}>{empty}</p>
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export default RichText
