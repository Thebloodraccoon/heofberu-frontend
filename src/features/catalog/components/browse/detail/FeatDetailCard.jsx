import { abilityLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow, RichText } from '@/components/ui'
import { Section, FeatureCards } from './detailHelpers.jsx'

export default function FeatDetailCard({ item }) {
  const prerequisite =
    item.prerequisite_ability || item.prerequisite_minimum_score != null
      ? `${item.prerequisite_ability ? `${abilityLabels[item.prerequisite_ability] ?? label(item.prerequisite_ability)}` : ''}${
          item.prerequisite_minimum_score != null && item.prerequisite_minimum_score !== ''
            ? ` ${item.prerequisite_minimum_score}`
            : ''
        }`.trim()
      : null

  const increases = item.ability_score_increases ?? []

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(item.name)}</h1>
          {prerequisite && <Badge className="my-[5px]">{`Треб: ${prerequisite}`}</Badge>}
        </div>
      </div>

      {(prerequisite || item.prerequisite_description || increases.length > 0) && (
        <FactList>
          {prerequisite && <FactRow label="Требования" value={prerequisite} />}
          {item.prerequisite_description && (
            <FactRow label="Доп. требования" value={<RichText value={item.prerequisite_description} className="inline" />} />
          )}
          {increases.length > 0 && (
            <FactRow
              label="Увеличение характеристик"
              value={
                <span className="font-semibold text-stone-100">
                  {increases.map((a) => `${abilityLabels[a.ability] ?? label(a.ability)} +${a.amount}`).join(' ')}
                </span>
              }
            />
          )}
        </FactList>
      )}

      {item.description && <RichText value={item.description} className="description-blockquote" />}

      {item.features && item.features.length > 0 && (
        <Section title="Умения">
          <FeatureCards features={item.features} />
        </Section>
      )}
    </Card>
  )
}
