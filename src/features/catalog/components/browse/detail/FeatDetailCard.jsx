import { abilityLabels, label, sentenceCase } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow, RichText } from '@/components/ui'
import { effectSummaryLines } from '@/lib/utils/featureEffects.js'
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
  const treeLines = effectSummaryLines(item)
  const hasTreeAbility = treeLines.some((l) => l.key === 'ability')

  const rows = []
  if (prerequisite) rows.push({ key: 'prereq', label: 'Требования', value: prerequisite })
  if (item.prerequisite_description) {
    rows.push({
      key: 'prereq-desc',
      label: 'Доп. требования',
      value: <RichText value={item.prerequisite_description} className="inline" />,
    })
  }
  for (const line of treeLines) rows.push({ key: line.key, label: line.label, value: line.text })
  // Новый бэк отдаёт полное дерево (строки характеристик в ability_effects);
  // legacy ability_score_increases показываем только когда дерева нет.
  if (!hasTreeAbility && increases.length > 0) {
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
        </div>
      </div>

      {rows.length > 0 && (
        <FactList>
          {rows.map((row) => (
            <FactRow key={row.key} label={row.label} value={row.value} />
          ))}
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