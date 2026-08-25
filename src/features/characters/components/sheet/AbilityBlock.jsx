import { mod } from '@/lib/utils/ability.js'
import { CheckDot, RollButton } from '@/components/sheet/primitives.jsx'

function SkillRow({ labelText, bonus, onRoll, dot }) {
  return (
    <div className="sheet-skill">
      <span className="sheet-skill__label">
        {dot != null && <CheckDot checked={dot.checked} expertise={dot.expertise} />}
        <span>{labelText}</span>
      </span>
      <RollButton bonus={bonus} onClick={onRoll} compact title={`Бросок: ${labelText}`} />
    </div>
  )
}

export default function AbilityBlock({
  stat,
  total,
  saveBonus,
  saveProf,
  skills,
  skillMap,
  skillBonus,
  skillChecked,
  skillExpertise,
  onRoll,
}) {
  const m = mod(total)
  return (
    <div className="sheet-ability">
      <div className="sheet-ability__name">
        <span className="sheet-ability__name-link">{stat.label}</span>
        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="sheet-ability__score">{total}</span>
        </span>
      </div>

      <SkillRow
        labelText="Проверка"
        bonus={m}
        onRoll={() => onRoll(`${stat.label}: проверка`, m)}
      />
      <SkillRow
        labelText="Спасбросок"
        bonus={saveBonus}
        dot={{ checked: saveProf }}
        onRoll={() => onRoll(`${stat.label}: спасбросок`, saveBonus)}
      />

      {(skills ?? []).map((sk) => {
        const name = skillMap.get(Number(sk.id))?.name ?? sk.name
        const bonus = skillBonus(sk)
        return (
          <SkillRow
            key={sk.id}
            labelText={name}
            bonus={bonus}
            dot={{ checked: skillChecked?.(sk) ?? false, expertise: skillExpertise?.(sk) ?? false }}
            onRoll={() => onRoll(`Навык: ${name}`, bonus)}
          />
        )
      })}
    </div>
  )
}
