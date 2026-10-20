import { Link } from 'react-router-dom'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'

const TAGS_ON_NOTICE = 4
const NO_RANK = new Map()

// Одна кампания — одна строка, но нарочно не похожая на строку статьи: полоса-объявление со скруглёнными по диагонали углами.
// Порядок: название, сыгранные столы и автор, зазывалка курсивом, самые популярные теги кампании.
// tagRank — место тега в общем рейтинге популярности; без него теги идут в порядке кампании.
export default function PresetNotice({ preset, tagRank = NO_RANK, heading: Heading = 'h2' }) {
  const pitch = stripGmBlocks(preset.pitch ?? '').trim()
  const tags = [...(preset.tags ?? [])].sort((a, b) => (tagRank.get(a.id) ?? Infinity) - (tagRank.get(b.id) ?? Infinity)).slice(0, TAGS_ON_NOTICE)
  return (
    <li className="adventure-notice">
      <Link to={`/public-campaigns/${preset.slug}`} className="adventure-notice-link">
        <div className="adventure-notice-body">
          <Heading className="adventure-notice-title">{preset.title}</Heading>
          <p className="adventure-notice-meta">
            <span className="adventure-notice-played">{preset.campaign_count > 0 ? `Сыграно столов: ${preset.campaign_count}` : 'Ещё не играли'}</span>
            <span>{preset.author ? `автор ${preset.author.username}` : 'автор удалён'}</span>
          </p>
          {pitch && <p className="adventure-notice-pitch">{pitch}</p>}
          {tags.length > 0 && <p className="adventure-notice-tags">{tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</p>}
        </div>
        <LoreIcon name="arrow" />
      </Link>
    </li>
  )
}
