import { STATS, mod } from '@/lib/utils/ability.js'
import { fmtBonus } from '@/lib/utils/sheet.js'

export default function AbilityScores({ totals, onRoll }) {
  return (
    <section className="character-ability-summary" aria-label="Характеристики персонажа">
      <div className="character-ability-grid">
        {STATS.map((stat) => (
          <button key={stat.code} type="button" className="character-ability-score" title={stat.label} onClick={() => onRoll(`${stat.label}: проверка`, mod(totals[stat.code]))} aria-label={`${stat.label}: проверка ${fmtBonus(mod(totals[stat.code]))}`}>
            <span>{stat.short}</span>
            <small>{totals[stat.code]}</small>
            <strong>{fmtBonus(mod(totals[stat.code]))}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}
