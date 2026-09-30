import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui'
import { sentenceCase } from '@/lib/i18n/index.js'
import { toPlainText } from '@/lib/utils/richText.js'
import { summaryBadges } from './detail/detailHelpers.jsx'
import { catalog } from '@/features/catalog/catalog.js'

export default function TileCard({ item, resource }) {
  const [searchParams] = useSearchParams()
  const badges = summaryBadges(item, resource)
  return (
    <Link
      to={{ pathname: `/catalog/${resource}/${item.id}`, search: searchParams.toString() }}
      className="catalog-tile group my-[3px]"
    >
      <span className="catalog-tile-kicker">{catalog[resource]?.label ?? resource}</span>
      <div className="catalog-tile-heading">
        <h2 className="catalog-tile-title">{sentenceCase(item.name)}</h2>
        <span className="catalog-tile-arrow" aria-hidden="true">↗</span>
      </div>
      {item.description && (
        <p className="item-desc-preview mt-1">{toPlainText(item.description)}</p>
      )}
      {badges.length > 0 && (
        <div className="badge-row mt-3">
          {badges.map((b, i) => (
            <Badge key={i} tone={b.tone} className="my-[5px]">{b.text}</Badge>
          ))}
        </div>
      )}
    </Link>
  )
}
