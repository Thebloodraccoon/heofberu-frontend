import { STATS } from '@/lib/utils/ability.js'
import { fmtBonus } from '@/lib/utils/sheet.js'
import { sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

function ProficiencyMark({ proficient, expert = false }) {
  return (
    <span className="character-proficiency-mark" aria-hidden="true">
      <span className={`character-proficiency-dot ${proficient || expert ? 'is-proficient' : ''} ${expert ? 'is-expert' : ''}`}>
        {expert && <LoreIcon name="star" />}
      </span>
    </span>
  )
}

function OwnedProficiencies({ items, options }) {
  const owned = options.filter((option) => items.includes(option.value))
  return owned.length > 0 ? (
    <ul className="character-owned-list">
      {owned.map((option) => <li key={option.value}>{option.label}</li>)}
    </ul>
  ) : <p className="text-xs text-stone-500">Нет владений</p>
}

export default function AbilitiesPanel({ skills, saveBonus, saveSet, skillBonus, profSet, expertiseSet, onRoll, armorProfs, armorOptions, weaponProfs, weaponOptions, topStats, secondaryStats }) {
  return (
    <div className="character-abilities">
      {topStats}
      {secondaryStats}
      <div className="character-abilities-columns">
        <div className="character-abilities-left">
          <h2 className="sheet-section-label">Спасброски</h2>
          <div className="character-save-grid">
            {STATS.map((stat) => (
              <button key={stat.code} type="button" className="character-check-row" onClick={() => onRoll(`${stat.label}: спасбросок`, saveBonus(stat.code))} aria-label={`${stat.label}: спасбросок ${fmtBonus(saveBonus(stat.code))}${saveSet.has(stat.code) ? ', владение' : ''}`}>
                <ProficiencyMark proficient={saveSet.has(stat.code)} />
                <span className="character-skill-name">{stat.label}</span><strong>{fmtBonus(saveBonus(stat.code))}</strong>
              </button>
            ))}
          </div>
          <section className="character-proficiencies" aria-label="Владение оружием и доспехами">
            <h3 className="sheet-section-label">Доспехи</h3><OwnedProficiencies items={armorProfs} options={armorOptions} />
            <h3 className="sheet-section-label">Оружие</h3><OwnedProficiencies items={weaponProfs} options={weaponOptions} />
          </section>
        </div>
        <div className="character-abilities-right">
          <h2 className="sheet-section-label">Навыки</h2>
          <div className="character-skill-list">
            {skills.map((skill) => {
              const name = skillLabels[skill.name] ?? sentenceCase(skill.name)
              const expert = expertiseSet.has(Number(skill.id))
              const proficient = profSet.has(Number(skill.id))
              const proficiency = expert ? 'Экспертиза' : proficient ? 'Владение' : ''
              const ability = STATS.find((stat) => stat.code === skill.ability)
              return (
                <button key={skill.id} type="button" className="character-check-row" onClick={() => onRoll(`Навык: ${name}`, skillBonus(skill))} aria-label={`${name}: ${fmtBonus(skillBonus(skill))}${proficiency ? `, ${proficiency}` : ''}`}>
                  <ProficiencyMark proficient={proficient} expert={expert} />
                  <span className="character-skill-name">{name}</span>
                  {ability && <small className="character-skill-ability" title={ability.label}>{ability.short}</small>}
                  <strong>{fmtBonus(skillBonus(skill))}</strong>
                </button>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  )
}
