import { RichText } from '@/components/ui'
import { splitEffectsSummary } from '@/lib/utils/effectsSummary.js'

const BOX = 'rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm leading-relaxed text-stone-300'

// Сводка эффектов особенности/черты в редакторе — две плашки: статичные
// эффекты и выбор эффектов (пустая часть не показывается). part ('static' |
// 'choice') — только одна часть: превью вверху своей вкладки редактора.
export default function EffectsSummary({ html, part = null }) {
  const split = splitEffectsSummary(html)
  if (part) {
    const value = part === 'static' ? split.fixed : split.choices
    if (!value) return null
    // Превью — ровно как в описании: со вступлением «Вы получаете:» / «У вас есть выбор:».
    const intro = part === 'static' ? '<p>Вы получаете:</p>' : '<p>У вас есть выбор:</p>'
    return (
      <section aria-label="Как выглядит в описании">
        <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">Как выглядит в описании</p>
        <RichText value={`${intro}${value}`} className={BOX} />
      </section>
    )
  }
  const { fixed, choices } = split
  return (
    <div className="space-y-3">
      {fixed && (
        <section aria-label="Статичные эффекты">
          <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">Статичные эффекты</p>
          <RichText value={fixed} className={BOX} />
        </section>
      )}
      {choices && (
        <section aria-label="Выбор эффектов">
          <p className="mb-1 text-xs uppercase tracking-wide text-stone-500">Выбор эффектов</p>
          <RichText value={choices} className={BOX} />
        </section>
      )}
    </div>
  )
}
