import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { sentenceCase } from '@/lib/i18n/index.js'
import { summaryBadges } from './detail/detailHelpers.jsx'

export default function TileCard({ item, resource }) {
  const [searchParams] = useSearchParams()
  return (
    <Link
      to={{ pathname: `/catalog/${resource}/${item.id}`, search: searchParams.toString() }}
      className="catalog-tile group my-[3px]"
    >
      <div className="list-row">
        <p className="catalog-tile-title">
          {sentenceCase(item.name)}
        </p>
      </div>
      {item.description && (
        <p className="item-desc-preview mt-1">{item.description}</p>
      )}
      {summaryBadges(item, resource).length > 0 && (
        <div className="badge-row mt-1.5">
          {summaryBadges(item, resource).map((b, i) => (
            <Badge key={i} tone={b.tone} className="my-[5px]">{b.text}</Badge>
          ))}
        </div>
      )}
    </Link>
  )
}
