import { ruLevel, sentenceCase } from '@/lib/i18n/index.js'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { Badge, Card, RichText } from '@/components/ui'

export default function FeatureDetailCard({ item }) {
  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(item.name)}</h1>
          {item.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(item.level)}</Badge>}
          {effectBadges(item).map((badge, i) => (
            <Badge key={i} tone={badge.tone} className="my-[5px]">
              {badge.text}
            </Badge>
          ))}
        </div>
      </div>

      {item.description || item.effects_summary ? (
        <RichText
          value={item.description}
          tail={item.effects_summary}
          className="text-sm leading-relaxed text-stone-200"
        />
      ) : (
        <p className="text-sm text-stone-500">Описание не указано</p>
      )}
    </Card>
  )
}
