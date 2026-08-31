import { diceTypeLabels, label } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow } from '@/components/ui'
import { Section, FeatureCards } from './detailHelpers.jsx'

export default function ItemDetailCard({ item }) {
  const damage =
    item.damage_dice_count && item.damage_dice_type
      ? `${item.damage_dice_count}${diceTypeLabels[item.damage_dice_type] ?? item.damage_dice_type}${
          item.damage_type ? ` ${label(item.damage_type)}` : ''
        }`.trim()
      : null

  const ac =
    item.armor_class_base != null && item.armor_class_base !== ''
      ? `${item.armor_class_base}${
          item.armor_class_dex_bonus ? ' + Ловкость' : ''
        }${item.armor_class_max_dex_bonus ? ` (макс. ${item.armor_class_max_dex_bonus})` : ''}`
      : null

  const properties = (item.weapon_properties ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => label(p))
    .join(', ')

  const cost =
    item.cost_gold != null && item.cost_gold !== '' ? `${item.cost_gold} зм.` : null
  const weight =
    item.weight != null && item.weight !== '' ? `${item.weight} фнт.` : null

  const rows = [
    item.rarity && item.rarity !== 'NONE' ? { label: 'Редкость', value: label(item.rarity) } : null,
    item.requires_attunement != null
      ? { label: 'Настройка', value: item.requires_attunement ? 'Требуется' : 'Не требуется' }
      : null,
    weight ? { label: 'Вес', value: weight } : null,
    cost ? { label: 'Цена', value: cost } : null,
    damage ? { label: 'Урон', value: damage } : null,
    ac ? { label: 'Класс доспеха', value: ac } : null,
    item.strength_requirement != null && item.strength_requirement !== ''
      ? { label: 'Требование силы', value: `Сила ${item.strength_requirement}` }
      : null,
    item.stealth_disadvantage ? { label: 'Скрытность', value: 'Помеха' } : null,
    properties ? { label: 'Свойства оружия', value: properties } : null,
  ]
    .filter(Boolean)
    .sort((a, b) => a.value.length - b.value.length)

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {item.item_type && <Badge className="my-[5px]">{label(item.item_type)}</Badge>}
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
            <FactRow key={r.label} label={r.label} value={r.value} />
          ))}
        </FactList>
      )}

      {item.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-sm leading-relaxed text-stone-200">
          {item.description}
        </p>
      )}

      {item.features && item.features.length > 0 && (
        <Section title="Свойства">
          <FeatureCards features={item.features} />
        </Section>
      )}
    </Card>
  )
}