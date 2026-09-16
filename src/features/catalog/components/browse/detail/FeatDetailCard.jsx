import { abilityLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow, RichText } from '@/components/ui'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { Section, FeatureCards } from './detailHelpers.jsx'

export default function FeatDetailCard({ item }) {
  // Требования собираются целиком: требуемая характеристика с её порогом и
  // минимальный уровень черты (например: «Ловкость 1, ур. 3»).
  const prereqParts = []
  if (item.prerequisite_ability || item.prerequisite_minimum_score != null) {
    prereqParts.push(
      `${item.prerequisite_ability ? `${abilityLabels[item.prerequisite_ability] ?? label(item.prerequisite_ability)}` : ''}${
        item.prerequisite_minimum_score != null && item.prerequisite_minimum_score !== ''
          ? ` ${item.prerequisite_minimum_score}`
          : ''
      }`.trim(),
    )
  }
  if (item.min_level != null && item.min_level !== '') prereqParts.push(`ур. ${item.min_level}`)
  const prerequisite = prereqParts.length > 0 ? prereqParts.join(', ') : null

  const increases = item.ability_score_increases ?? []

  const rows = []
  if (prerequisite) rows.push({ key: 'prereq', label: 'Требования', value: prerequisite })
  if (item.prerequisite_description) {
    rows.push({
      key: 'prereq-desc',
      label: 'Доп. требования',
      value: <RichText value={item.prerequisite_description} className="inline" />,
    })
  }
  // Новый бэк отдаёт полное дерево эффектов (ability_effects, effects_summary);
  // legacy ability_score_increases показываем только когда бэк не прислал summary.
  if (!item.effects_summary && increases.length > 0) {
    rows.push({
      key: 'asi',
      label: 'Увеличение характеристик',
      value: increases.map((a) => `${abilityLabels[a.ability] ?? label(a.ability)} +${a.amount}`).join(' '),
    })
  }

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(item.name)}</h1>
          {prerequisite && <Badge className="my-[5px]">{`Треб: ${prerequisite}`}</Badge>}
          {effectBadges(item).map((badge, i) => (
            <Badge key={i} tone={badge.tone} className="my-[5px]">
              {badge.text}
            </Badge>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <FactList>
          {rows.map((row) => (
            <FactRow key={row.key} label={row.label} value={row.value} />
          ))}
        </FactList>
      )}

      {(item.description || item.effects_summary) && (
        <RichText value={item.description} tail={item.effects_summary} className="description-blockquote" />
      )}

      {item.features && item.features.length > 0 && (
        <Section title="Умения">
          <FeatureCards features={item.features} />
        </Section>
      )}
    </Card>
  )
}
