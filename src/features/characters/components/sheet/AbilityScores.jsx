import { STATS, mod } from '@/lib/utils/ability.js'
import { fmtBonus } from '@/lib/utils/sheet.js'

// Без onRoll — только чтение (публичный лист героя): те же плитки, но не кнопки.
export default function AbilityScores({ totals, onRoll }) {
  return (
    <section className="character-ability-summary" aria-label="Характеристики персонажа">
      <div className="character-ability-grid">
        {STATS.map((stat) => {
          const content = <><span>{stat.short}</span><small>{totals[stat.code]}</small><strong>{fmtBonus(mod(totals[stat.code]))}</strong></>
          return onRoll
            ? <button key={stat.code} type="button" className="character-ability-score" title={stat.label} onClick={() => onRoll(`${stat.label}: проверка`, mod(totals[stat.code]))} aria-label={`${stat.label}: проверка ${fmtBonus(mod(totals[stat.code]))}`}>{content}</button>
            : <div key={stat.code} className="character-ability-score" title={stat.label} role="group" aria-label={`${stat.label}: ${totals[stat.code]}, модификатор ${fmtBonus(mod(totals[stat.code]))}`}>{content}</div>
        })}
      </div>
    </section>
  )
}
