import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { summaryBadges } from './detail/detailHelpers.jsx'

export default function TileCard({ item, resource }) {
  return (
    <Link
      to={`/catalog/${resource}/${item.id}`}
      className="group card-hover fantasy-panel my-[5px] rounded-lg p-5 transition hover:border-ember/70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-base font-bold text-stone-100 group-hover:text-ember">
          {item.name}
        </p>
      </div>
      {item.description && (
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-stone-400">{item.description}</p>
      )}
      {summaryBadges(item).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summaryBadges(item).map((b, i) => (
            <Badge key={i} tone={b.tone} className="my-[5px]">{b.text}</Badge>
          ))}
        </div>
      )}
    </Link>
  )
}
