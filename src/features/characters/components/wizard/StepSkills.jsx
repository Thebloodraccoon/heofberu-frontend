import { abilityName } from '@/lib/utils/ability.js'
import { sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'

const skillName = (s) => {
  const n = typeof s === 'string' ? s : (s?.name ?? '')
  return skillLabels[n] ?? sentenceCase(n)
}

export default function StepSkills({ stepNo, total, form, update, lookups }) {
  const classDetail = lookups.classDetail
  const raceGranted = lookups.raceDetail?.granted_skills ?? []
  const bgGranted = lookups.backgroundDetail?.granted_skills ?? []

  const allGranted = (() => {
    const map = new Map()
    for (const s of raceGranted) {
      if (s?.id == null) continue
      const entry = map.get(Number(s.id)) ?? { name: skillName(s), sources: new Set() }
      entry.sources.add('раса')
      map.set(Number(s.id), entry)
    }
    for (const s of bgGranted) {
      if (s?.id == null) continue
      const entry = map.get(Number(s.id)) ?? { name: skillName(s), sources: new Set() }
      entry.sources.add('предыстория')
      map.set(Number(s.id), entry)
    }
    return [...map.values()]
  })()
  const grantedIds = new Set(
    [...raceGranted, ...bgGranted].map((s) => Number(s.id)).filter(Number.isFinite),
  )
  const choiceCount = classDetail?.skill_choice_count ?? 0

  // Навыки, уже выданные расой/предысторией, нельзя выбирать повторно.
  const pool = (classDetail?.available_skills ?? []).filter(
    (s) => s && s.id != null && !grantedIds.has(Number(s.id)),
  )

  const chosen = (form.class_skill_ids ?? []).map(Number)

  const toggleChoice = (id) => {
    const has = chosen.includes(id)
    const atLimit = chosen.length >= choiceCount
    if (!has && atLimit) return
    const next = has ? chosen.filter((x) => x !== id) : [...chosen, id]
    update({ class_skill_ids: next })
  }

  const SkillToggle = ({ name, sub, on, disabled, onClick }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm transition ${
        on ? 'border-ember/70 bg-ember/10 text-stone-100' : 'border-stone-700/60 bg-stone-800/40 text-stone-300 hover:border-ember/40'
      } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
    >
      <span>
        <span className="block font-medium">{name}</span>
        {sub && <span className="block text-xs text-stone-500">{sub}</span>}
      </span>
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
          on ? 'border-ember bg-ember text-white' : 'border-stone-600 text-transparent'
        }`}
      >
        ✓
      </span>
    </button>
  )

  return (
    <StepShell
      stepNo={stepNo}
      total={total}
      title="Навыки"
      subtitle={
        classDetail
          ? `Класс «${classDetail.name}» даёт выбрать ${choiceCount} из его навыков.`
          : 'Сначала выберите класс.'
      }
    >
      <Section>
        {!classDetail && <Hint>Сначала выберите класс.</Hint>}
        {classDetail && (
          <>
            {allGranted.length > 0 && (
              <p className="mb-4 text-sm leading-relaxed text-stone-400">
                Навыки уже получены на предыдущих этапах:
                <span className="text-stone-200"> {allGranted.sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((g) => g.name).join(', ')}</span>
              </p>
            )}
            {choiceCount === 0 ? (
              <Hint>У этого класса нет навыков на выбор.</Hint>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <Tag tone={chosen.length >= choiceCount ? 'good' : 'default'}>
                    Выбрано: {chosen.length} из {Math.min(choiceCount, pool.length + chosen.length)}
                  </Tag>
                  {pool.length === 0 && <Hint>Все доступные навыки уже выданы расой и предысторией.</Hint>}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {[...pool]
                    .sort((a, b) => skillName(a).localeCompare(skillName(b), 'ru'))
                    .map((s) => (
                      <SkillToggle
                        key={s.id}
                        name={skillName(s)}
                        sub={abilityName(s.ability)}
                        on={chosen.includes(Number(s.id))}
                        disabled={!chosen.includes(Number(s.id)) && chosen.length >= choiceCount}
                        onClick={() => toggleChoice(Number(s.id))}
                      />
                    ))}
                </div>
              </>
            )}
          </>
        )}
      </Section>
    </StepShell>
  )
}