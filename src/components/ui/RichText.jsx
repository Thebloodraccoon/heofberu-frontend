import { renderRichHtml } from '@/lib/utils/richText.js'

// Безопасный рендер сохранённого текста: Markdown (новый формат) либо HTML от
// прежнего редактора / обычный текст (старые записи) — см. renderRichHtml.
// Всегда идёт через санитайзер, единый путь отображения.
// tail — доп. текст (например, effects_summary с бэка), который дорендеривается
// в конце того же дива в том же формате.
export function RichText({ value, className = '', empty = '—', tail }) {
  const body = renderRichHtml(value)
  const tailHtml = tail ? renderRichHtml(tail) : ''
  const html = body && tailHtml ? `${body}<p><br></p>${tailHtml}` : body + tailHtml
  if (!html) {
    return (
      <p className={className}>
        <span className="text-stone-500">{empty}</span>
      </p>
    )
  }
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}

export default RichText
