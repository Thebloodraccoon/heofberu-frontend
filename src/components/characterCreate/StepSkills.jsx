import { Hint, Panel, StepShell, Tag } from './StepShell.jsx'

export default function StepSkills({ stepNo, total, form, update, lookups, derived }) {
  const { classDetail, raceDetail, backgroundDetail } = lookups
  const expertiseBudget = derived.expertiseBudget

  const pool = (classDetail?.available_skills ?? []).filter((s) => s && s.id != null)
  const raceGranted = raceDetail?.granted_skills ?? []
  const bgGranted = backgroundDetail?.granted_skills ?? []
  const choiceCount = classDetail?.skill_choice_count ?? 0

  const chosen = (form.class_skill_ids ?? []).map(Number)
  const expertise = (form.expertise_ids ?? []).map(Number)

  const findName = (id) => {
    const all = [...pool, ...raceGranted, ...bgGranted]
    return all.find((s) => Number(s.id) === id)?.name
  }

  const toggleChoice = (id) => {
    const has = chosen.includes(id)
    const next = has ? chosen.filter((x) => x !== id) : [...chosen, id]
    const patch = { class_skill_ids: next }
    if (!has) patch.expertise_ids = expertise.filter((x) => x !== id)
    update(patch)
  }

  const toggleExpertise = (id) => {
    const has = expertise.includes(id)
    if (has) {
      update({ expertise_ids: expertise.filter((x) => x !== id) })
    } else if (expertise.length < expertiseBudget) {
      update({ expertise_ids: [...expertise, id] })
    }
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
    <StepShell stepNo={stepNo} total={total} title="Навыки" subtitle="Выберите владение навыками класса">
      <Panel title={classDetail?.name ? `Навыки класса «${classDetail.name}»` : 'Навыки класса'}>
        {!classDetail && <Hint>Сначала выберите класс.</Hint>}
        {classDetail && choiceCount === 0 && (
          <Hint>У этого класса нет навыков на выбор.</Hint>
        )}
        {classDetail && choiceCount > 0 && (
          <>
            <div className="mb-3">
              <Tag tone={chosen.length >= choiceCount ? 'good' : 'default'}>
                Выбрано: {chosen.length} из {choiceCount}
              </Tag>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {pool.map((s) => (
                <SkillToggle
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  sub={s.ability}
                  on={chosen.includes(Number(s.id))}
                  onClick={() => toggleChoice(Number(s.id))}
                />
              ))}
            </div>
          </>
        )}
      </Panel>

      <Panel title="Навыки расы и предыстории">
        {(raceGranted.length === 0 && bgGranted.length === 0 && (
          <Hint>Ни раса, ни предыстория не дают дополнительных навыков.</Hint>
        )) || (
          <div className="flex flex-wrap gap-2">
            {raceGranted.map((s) => (
              <Tag key={`r${s.id}`} tone="good">
                {s.name} · раса
              </Tag>
            ))}
            {bgGranted.map((s) => (
              <Tag key={`b${s.id}`} tone="good">
                {s.name} · предыстория
              </Tag>
            ))}
          </div>
        )}
      </Panel>

      {expertiseBudget > 0 && (
        <Panel title="Экспертиза">
          <div className="mb-3">
            <Tag tone={expertise.length >= expertiseBudget ? 'good' : 'default'}>
              Отмечено: {expertise.length} из {expertiseBudget}
            </Tag>
            <Hint className="mt-1">Отметьте {expertiseBudget} навык(а/ов) класса — их бонус мастерства удвоится.</Hint>
          </div>
          {chosen.length === 0 && <Hint>Сначала выберите навыки класса.</Hint>}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {chosen.map((id) => (
              <SkillToggle
                key={id}
                id={id}
                name={findName(id) || `Навык #${id}`}
                on={expertise.includes(id)}
                disabled={!expertise.includes(id) && expertise.length >= expertiseBudget}
                onClick={() => toggleExpertise(id)}
              />
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Спасброски">
        <Hint>Спасброски от вашего класса выдаются автоматически при создании.</Hint>
        {(classDetail?.saving_throws ?? []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(classDetail?.saving_throws ?? []).map((s) => (
              <Tag key={s.ability} tone="accent">
                {s.ability}
              </Tag>
            ))}
          </div>
        )}
      </Panel>
    </StepShell>
  )
}
