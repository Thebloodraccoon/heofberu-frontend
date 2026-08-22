import { diceTypeLabels, label } from '@/lib/i18n/index.js'
import { Badge, Card, FactList, FactRow } from '@/components/ui'
import { spellLevel, Section } from './detailHelpers.jsx'

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }

export default function SpellDetailCard({ spell }) {
  const components = (spell.components ?? [])
    .map((c) => COMPONENT_FULL[c] ?? label(c))
    .join(', ')

  const rangeText =
    spell.range_value != null && spell.range_value !== ''
      ? `${spell.range_value} футов`
      : spell.range_type
        ? label(spell.range_type)
        : null
  const durationText = spell.duration
    ? spell.is_concentration
      ? `Концентрация, вплоть до ${label(spell.duration)}`
      : label(spell.duration)
    : null
  const componentsText =
    spell.components && spell.components.length > 0
      ? spell.components.includes('MATERIAL') && spell.material
        ? `${components} (${spell.material})`
        : components
      : null

  const damageText =
    spell.damage_dice_count && spell.damage_dice_type
      ? `${spell.damage_dice_count}${diceTypeLabels[spell.damage_dice_type] ?? spell.damage_dice_type}${
          spell.damage_type ? ` ${label(spell.damage_type)}` : ''
        }`.trim()
      : null
  const healingText =
    spell.healing_dice_count && spell.healing_dice_type
      ? `${spell.healing_dice_count}${diceTypeLabels[spell.healing_dice_type] ?? spell.healing_dice_type}${
          spell.healing_target ? ` ${label(spell.healing_target)}` : ''
        }`.trim()
      : null

  const rows = [
    spell.cast_time ? { label: 'Время накладывания', value: label(spell.cast_time) } : null,
    rangeText ? { label: 'Дистанция', value: rangeText } : null,
    durationText ? { label: 'Длительность', value: durationText } : null,
    componentsText ? { label: 'Компоненты', value: componentsText } : null,
    damageText ? { label: 'Урон', value: damageText } : null,
    healingText ? { label: 'Лечение', value: healingText } : null,
  ]
    .filter(Boolean)
    .sort((a, b) => a.value.length - b.value.length)

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{spell.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {spell.level && <Badge tone="accent" className="my-[5px]">{spellLevel(spell.level)}</Badge>}
            {spell.school && <Badge className="my-[5px]">{label(spell.school)}</Badge>}
            {spell.is_ritual && <Badge className="my-[5px]">Ритуал</Badge>}
          </div>
        </div>
        {spell.source && <p className="mt-1 text-xs text-stone-500">Источник: {spell.source}</p>}
      </div>

      {rows.length > 0 && (
        <FactList>
          {rows.map((r) => (
            <FactRow key={r.label} label={r.label} value={r.value} />
          ))}
        </FactList>
      )}

      {spell.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {spell.description}
        </p>
      )}

      {spell.higher_levels && (
        <Section title="На более высоких уровнях">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{spell.higher_levels}</p>
        </Section>
      )}
    </Card>
  )
}
