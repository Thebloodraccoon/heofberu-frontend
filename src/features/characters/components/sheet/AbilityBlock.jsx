import { mod } from '@/lib/utils/ability.js'
import { CheckDot, RollButton } from '@/components/sheet/primitives.jsx'

function SkillRow({ labelText, bonus, onRoll, dot, rollsOn }) {
  return (
    <div className="sheet-skill">
      <span className="sheet-skill__label">
        {dot != null && <CheckDot checked={dot.checked} onChange={dot.onChange} />}
        <span>{labelText}</span>
      </span>
      <RollButton bonus={bonus} onClick={onRoll} compact disabled={!rollsOn} title={`Бросок: ${labelText}`} />
    </div>
  )
}

export default function AbilityBlock({ stat, total, saveBonus, saveProf, skills, skillMap, skillBonus, rollsOn, onRoll }) {
  const m = mod(total)
  return (
    <div className="sheet-ability">
      <div className="sheet-ability__name">
        <span className="sheet-ability__name-link">{stat.label}</span>
        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="text-xs text-stone-600">—</span>
          <span className="sheet-ability__score">{total}</span>
        </span>
      </div>

      <div className="sheet-ability__checks">
        <SkillRow
          labelText="Проверка"
          bonus={m}
          rollsOn={rollsOn}
          onRoll={() => onRoll(`${stat.label}: проверка`, m)}
        />
        <SkillRow
          labelText="Спасбросок"
          bonus={saveBonus}
          rollsOn={rollsOn}
          dot={{ checked: saveProf }}
          onRoll={() => onRoll(`${stat.label}: спасбросок`, saveBonus)}
        />
      </div>

      {(skills ?? []).map((sk) => (
        <SkillRow
          key={sk.id}
          labelText={skillMap.get(Number(sk.id))?.name ?? sk.name}
          bonus={skillBonus(sk)}
          rollsOn={rollsOn}
          onRoll={() => onRoll(`Навык: ${skillMap.get(Number(sk.id))?.name ?? sk.name}`, skillBonus(sk))}
        />
      ))}
    </div>
  )
}
