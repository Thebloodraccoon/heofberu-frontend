import { Link } from 'react-router-dom'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'

const TAGS_ON_NOTICE = 4
const NO_RANK = new Map()

// Одна кампания — одна строка, но нарочно не похожая на строку статьи: полоса-объявление со скруглёнными по диагонали углами.
// Порядок: название, зазывалка, автор и столы, самые популярные теги кампании.
// tagRank — место тега в общем рейтинге популярности; без него теги идут в порядке кампании.
export default function PresetNotice({ preset, tagRank = NO_RANK, heading: Heading = 'h2', listSearch }) {
  const pitch = stripGmBlocks(preset.pitch ?? '').trim()
  const allTags = [...(preset.tags ?? [])].sort((a, b) => (tagRank.get(a.id) ?? Infinity) - (tagRank.get(b.id) ?? Infinity))
  const tags = allTags.slice(0, TAGS_ON_NOTICE)
  const hiddenTags = allTags.slice(TAGS_ON_NOTICE)
  return (
    <li className="adventure-notice">
      <Link to={`/public-campaigns/${preset.slug}`} state={listSearch !== undefined ? { campaignListSearch: listSearch } : undefined} className="adventure-notice-link">
        <div className="adventure-notice-body">
          <Heading className="adventure-notice-title">{preset.title}</Heading>
          {pitch && <p className="adventure-notice-pitch">{pitch}</p>}
          <p className="adventure-notice-meta">
            <span>{preset.author ? `@${preset.author.username}` : 'Автор удалён'}</span>
            <span>{preset.campaign_count > 0 ? `Столов: ${preset.campaign_count}` : 'Столов пока нет'}</span>
          </p>
          {tags.length > 0 && <p className="adventure-notice-tags">{tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}{hiddenTags.length > 0 && <span title={hiddenTags.map((tag) => `#${tag.name}`).join(', ')} aria-label={`Ещё тегов: ${hiddenTags.length}`}>+{hiddenTags.length}</span>}</p>}
        </div>
        <LoreIcon name="arrow" />
      </Link>
    </li>
  )
}
