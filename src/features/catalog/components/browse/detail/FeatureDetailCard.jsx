import { ruLevel } from '@/lib/i18n/index.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { effectSummaryLines } from '@/lib/utils/featureEffects.js'
import { Badge, Card, FactList, FactRow, RichText } from '@/components/ui'

export default function FeatureDetailCard({ item }) {
  const lines = effectSummaryLines(item)

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(item.name)}</h1>
          {item.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(item.level)}</Badge>}
        </div>
      </div>

      {lines.length > 0 && (
        <FactList>
          {lines.map((line) => (
            <FactRow key={line.key} label={line.label} value={line.text} />
          ))}
        </FactList>
      )}

      {item.description ? (
        <RichText value={item.description} className="text-sm leading-relaxed text-stone-200" />
      ) : (
        <p className="text-sm text-stone-500">Описание не указано</p>
      )}
    </Card>
  )
}