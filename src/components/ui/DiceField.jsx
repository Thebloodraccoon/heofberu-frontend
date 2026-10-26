import DiceIcon from '@/components/sheet/DiceIcon.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { diceTypeLabels } from '@/lib/i18n/index.js'
import useRovingRadio from './useRovingRadio.js'

const DICE = Object.keys(diceTypeLabels) // D4…D100
const sidesOf = (type) => Number(type.slice(1))
const MAX_COUNT = 100

// Поле «Кость» — как окно бросков: крупные плитки кубиков (выбирается одна), у выбранной
// под кубиком «− N +»; в строке заголовка итог «2к6» и «Убрать»; под плитками одной строкой —
// aside (тип урона, бонус урона…). Значение — { count, type }: count — число или '' (не
// задано), type — 'D6'… или ''. withCount=false — только кость (кость хитов); optional —
// можно убрать кость совсем («Без кости»).
export default function DiceField({ label, count, type, onChange, withCount = true, optional = false, min = 1, aside = null }) {
  const n = Math.max(Number(count) || 0, min)
  const formula = type ? `${withCount ? n : ''}${diceTypeLabels[type]}` : 'Без кости'
  const pick = (next) => onChange({ count: withCount ? n : count, type: next })
  const step = (delta) => onChange({ count: Math.min(MAX_COUNT, Math.max(min, n + delta)), type })
  const radio = useRovingRadio(DICE, type, pick)

  return (
    <div className="dice-field" role="group" aria-label={label}>
      <div className="dice-field-head">
        <span className="dice-field-label">{label}</span>
        <span className="dice-field-formula" aria-live="polite">{formula}</span>
        {optional && type && (
          <button type="button" className="dice-field-clear" onClick={() => onChange({ count: '', type: '' })}><LoreIcon name="close" />Убрать</button>
        )}
      </div>
      <div className="dice-field-grid" role="radiogroup" aria-label={label}>
        {DICE.map((d) => {
          const selected = type === d
          return (
            <div key={d} className="dice-field-tile" data-selected={selected}>
              <button type="button" aria-label={diceTypeLabels[d]} className="dice-field-select" {...radio(d)}>
                <DiceIcon sides={sidesOf(d)} />
                <span>{diceTypeLabels[d]}</span>
              </button>
              {withCount && (
                // Место под счётчик есть у каждой плитки — сетка не прыгает при выборе.
                <div className="dice-field-counter" style={{ visibility: selected ? 'visible' : 'hidden' }} aria-hidden={!selected}>
                  <button type="button" className="character-dice-step" aria-label={`Меньше: ${label}`} disabled={n <= min} onClick={() => step(-1)}><LoreIcon name="minus" /></button>
                  <span className="character-dice-count" aria-label={`Количество: ${label}`}>{n}</span>
                  <button type="button" className="character-dice-step" aria-label={`Больше: ${label}`} disabled={n >= MAX_COUNT} onClick={() => step(1)}><LoreIcon name="plus" /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {aside && <div className="dice-field-aside">{aside}</div>}
    </div>
  )
}
