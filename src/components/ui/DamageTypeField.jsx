import { damageTypeLabels } from '@/lib/i18n/index.js'
import useRovingRadio from './useRovingRadio.js'

const GROUPS = [
  ['Физический', ['SLASHING', 'PIERCING', 'BLUDGEONING']],
  ['Стихийный', ['FIRE', 'COLD', 'LIGHTNING', 'THUNDER', 'ACID', 'POISON']],
  ['Магический', ['FORCE', 'NECROTIC', 'RADIANT', 'PSYCHIC']],
]

// Тип урона чипами по группам — все сразу; «Нет» (тип не задан, '') первым, если optional.
export default function DamageTypeField({ label = 'Тип урона', value, onChange, optional = true }) {
  // Одна группа на все ряды: стрелки идут сквозь группы, Tab — одна остановка.
  const radio = useRovingRadio([...(optional ? [''] : []), ...GROUPS.flatMap(([, types]) => types)], value ?? '', onChange)
  const chip = (type) => (
    <button key={type} type="button" className="catalog-filter-choice" {...radio(type)}>
      {type ? damageTypeLabels[type] : 'Нет'}
    </button>
  )

  return (
    <div role="radiogroup" aria-label={label} className="damage-type-field">
      {GROUPS.map(([group, types], i) => (
        <div key={group} className="damage-type-row">
          <span className="damage-type-group">{group}</span>
          <div className="flex flex-wrap gap-2">
            {i === 0 && optional && chip('')}
            {types.map(chip)}
          </div>
        </div>
      ))}
    </div>
  )
}
