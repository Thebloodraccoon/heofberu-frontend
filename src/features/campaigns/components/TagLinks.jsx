import { Link } from 'react-router-dom'

// Теги — общий словарь с лором: клик ведёт в лор с фильтром по тегу, как теги статьи.
export default function TagLinks({ tags }) {
  if (!tags?.length) return null
  return <div className="article-detail-tags mt-3 flex flex-wrap items-center gap-2" aria-label="Теги">{tags.map((tag) => <Link key={tag.id} to={`/lore?tags=${tag.id}`} className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400 hover:border-ember hover:text-ember">#{tag.name}</Link>)}</div>
}
