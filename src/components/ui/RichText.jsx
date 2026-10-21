import { renderRichHtml } from '@/lib/utils/richText.js'

// Безопасный рендер сохранённого текста: Markdown (новый формат) либо HTML от
// прежнего редактора / обычный текст (старые записи) — см. renderRichHtml.
// Всегда идёт через санитайзер, единый путь отображения.
// tail — доп. текст (например, effects_summary с бэка) или список таких
// кусков (растущая строка особенности + effects_summary): дорендериваются по
// порядку в конце того же дива, каждый в своём формате.
export function RichText({ value, className = '', empty = '—', tail }) {
  const body = renderRichHtml(value)
  const tailHtml = (Array.isArray(tail) ? tail : [tail]).map((part) => (part ? renderRichHtml(part) : '')).join('')
  // Склеиваем встык, без разделяющего пустого абзаца: отступ между описанием и
  // резюме эффектов и так даёт блочная вёрстка .rich-text, а лишний <p><br></p>
  // рисовал пустую строку во всех карточках особенностей и черт.
  const html = body + tailHtml
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
