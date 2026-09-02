import { ruLevel } from '@/lib/i18n/index.js'
import { abilityLabels, label } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow } from '@/components/ui'

export default function FeatureDetailCard({ item }) {
  const increases = item.ability_increases ?? []

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
          {item.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(item.level)}</Badge>}
        </div>
      </div>

      {increases.length > 0 && (
        <FactList>
          <FactRow
            label="Увеличение характеристик"
            value={
              <span className="font-semibold text-stone-100">
                {increases
                  .map((a) => {
                    const suffix =
                      a.amount != null
                        ? `${a.amount > 0 ? '+' : ''}${a.amount}`
                        : ''
                    const cap = a.new_cap != null ? ` (макс. ${a.new_cap})` : ''
                    return `${abilityLabels[a.ability] ?? label(a.ability)} ${suffix}${cap}`
                  })
                  .join(' ')}
              </span>
            }
          />
        </FactList>
      )}

      {item.description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{item.description}</p>
      ) : (
        <p className="text-sm text-stone-500">Описание не указано</p>
      )}
    </Card>
  )
}
