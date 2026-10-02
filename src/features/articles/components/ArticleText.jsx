import { RichText } from '@/components/ui'
import { splitGmBlocks } from '@/features/articles/secrets.js'
import LoreIcon from './LoreIcon.jsx'

// Текст статьи для ГМ в режиме чтения: блоки `:::gm … :::` — в рамке «Только для мастера», как в лоре.
export default function ArticleText({ value, empty = 'Текст статьи пока не написан.' }) {
  const segments = splitGmBlocks(value)
  if (segments.length === 0) return <RichText value="" empty={empty} />
  return (
    <div className="space-y-4">
      {segments.map((seg, i) =>
        seg.secret ? (
          <aside key={i} className="lore-secret">
            <p className="lore-secret-label"><LoreIcon name="eye" /> Только для мастера</p>
            <RichText value={seg.text} empty="Пустой секрет." />
          </aside>
        ) : (
          <RichText key={i} value={seg.text} />
        ),
      )}
    </div>
  )
}
