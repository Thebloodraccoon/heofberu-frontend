import { label, sentenceCase } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow, RichText } from '@/components/ui'
import { itemFactRows, itemKindText } from '@/lib/utils/itemFacts.js'
import { describeArmorClassEffect, describeSpeedEffect } from '@/lib/utils/effectBundle.js'
import { Section } from './detailHelpers.jsx'
import WeaponPropertyChips from '@/features/catalog/components/WeaponPropertyChips.jsx'

export default function ItemDetailCard({ item }) {
  const rows = [
    item.rarity && item.rarity !== 'NONE' ? { key: 'rarity', label: 'Редкость', value: label(item.rarity) } : null,
    ...itemFactRows(item),
  ]
    .filter(Boolean)
    .sort((a, b) => a.value.length - b.value.length)

  // httpClient раскладывает item.effects в плоские speed_effects/armor_class_effects.
  const effects = [
    ...(item.armor_class_effects ?? []).map(describeArmorClassEffect),
    ...(item.speed_effects ?? []).map(describeSpeedEffect),
  ]

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(item.name)}</h1>
          <div className="flex flex-wrap gap-1.5">
            {item.kind && <Badge className="my-[5px]">{itemKindText(item)}</Badge>}
            {item.rarity && item.rarity !== 'NONE' && (
              <Badge tone={item.rarity === 'LEGENDARY' || item.rarity === 'ARTIFACT' ? 'accent' : 'default'} className="my-[5px]">
                {label(item.rarity)}
              </Badge>
            )}
            {item.requires_attunement && <Badge tone="accent" className="my-[5px]">Требует настройки</Badge>}
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <FactList>
          {rows.map((r) => (
            <FactRow key={r.key} label={r.label} value={r.properties ? <WeaponPropertyChips properties={r.properties} /> : r.value} />
          ))}
        </FactList>
      )}

      {effects.length > 0 && (
        <Section title="Влияние на КД и скорость">
          <ul className="list-disc space-y-0.5 pl-5 text-stone-200">
            {effects.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </Section>
      )}

      {item.description && <RichText value={item.description} className="description-blockquote" />}
    </Card>
  )
}
