import { ruLevel } from '@/lib/i18n/index.js'
import { Badge, Card } from '@/components/ui'

export default function FeatureDetailCard({ item }) {
  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
          {item.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(item.level)}</Badge>}
        </div>
      </div>

      {item.description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{item.description}</p>
      ) : (
        <p className="text-sm text-stone-500">Описание не указано</p>
      )}
    </Card>
  )
}
