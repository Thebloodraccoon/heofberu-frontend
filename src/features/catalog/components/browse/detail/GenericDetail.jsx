import { fieldLabel } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow } from '@/components/ui'
import {
  isEmptyValue,
  skipFields,
  summaryBadges,
  Section,
  FeatureCards,
  FieldValue,
} from './detailHelpers.jsx'

export default function GenericDetail({ item, hideAbility = false }) {
  const rows = Object.entries(item).filter(
    ([k]) => !skipFields.has(k) && !k.endsWith('_id') && !(hideAbility && k === 'ability')
  )
  const visible = rows.filter(([, v]) => !isEmptyValue(v))
  const badges = summaryBadges(item)

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {badges.map((b, i) => (
            <Badge key={i} tone={b.tone} className="my-[5px]">{b.text}</Badge>
          ))}
        </div>
      )}

      {visible.length > 0 && (
        <FactList>
          {visible.map(([k, v]) => (
            <FactRow key={k} label={fieldLabel(k)} value={<FieldValue value={v} />} />
          ))}
        </FactList>
      )}

      {item.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {item.description}
        </p>
      )}

      {item.higher_levels && (
        <Section title="На более высоких уровнях">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{item.higher_levels}</p>
        </Section>
      )}

      {item.features && item.features.length > 0 && (
        <Section title="Особенности">
          <FeatureCards features={item.features} />
        </Section>
      )}
    </Card>
  )
}
