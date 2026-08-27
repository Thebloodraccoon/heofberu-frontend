import { abilityName } from '@/lib/utils/ability.js'
import { sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'

const skillName = (s) => {
  const n = typeof s === 'string' ? s : (s?.name ?? '')
  return skillLabels[n] ?? sentenceCase(n)
}

export default function StepClass({ stepNo, total, form, update, lookups }) {
  const classDetail = lookups.classDetail
  const subclassDetail = lookups.subclassDetail
  const selectedClass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const subclasses = classDetail?.subclasses ?? []

  const classSearch = useSearch(lookups.classes ?? [])
  const subclassSearch = useSearch(subclasses)

  const raceGranted = lookups.raceDetail?.granted_skills ?? []
  const bgGranted = lookups.backgroundDetail?.granted_skills ?? []
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
    <StepShell stepNo={stepNo} total={total} title="Класс" subtitle="Класс, подкласс и навыки класса">
      <Section title="Класс">
        <PickerGrid
          items={classSearch.filtered}
          query={classSearch.query}
          onQueryChange={classSearch.setQuery}
          searchPlaceholder="Поиск класса по названию и описанию…"
          selectedId={form.class_id}
          onSelect={(c) => update({ class_id: String(c.id), subclass_id: '', class_skill_ids: [] })}
          subtitleOf={(c) => (c.hit_dice ? `к${c.hit_dice.replace('D', '')}` : undefined)}
        />
        {selectedClass && !classDetail && <Hint className="mt-3">Загружаем класс…</Hint>}
        {classDetail && (
          <div className="mt-4 space-y-3">
            {classDetail.description && <p className="text-sm leading-relaxed text-stone-300">{classDetail.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {classDetail.hit_dice && <Tag>Кость хитов: к{classDetail.hit_dice.replace('D', '')}</Tag>}
              {(classDetail.saving_throws ?? []).map((s) => (
                <Tag key={s.ability} tone="accent">
                  Спасбросок: {abilityName(s.ability)}
                </Tag>
              ))}
              {(classDetail.weapon_proficiencies ?? []).map((w) => (
                <Tag key={w.weapon_category} tone="dim">
                  Оружие: {weaponProficiencyLabels[w.weapon_category] ?? w.weapon_category}
                </Tag>
              ))}
              {classDetail.skill_choice_count > 0 && <Tag>Навыков на выбор: {classDetail.skill_choice_count}</Tag>}
              {classDetail.spellcasting_ability && <Tag>Заклинатель: {abilityName(classDetail.spellcasting_ability)}</Tag>}
            </div>
          </div>
        )}
      </Section>

      {subclasses.length > 0 && (
        <Section title="Подкласс (необязательно)">
          <PickerGrid
            items={[{ id: '', name: 'Без подкласса', description: 'Только основной класс' }, ...subclassSearch.filtered]}
            query={subclassSearch.query}
            onQueryChange={subclassSearch.setQuery}
            searchPlaceholder="Поиск подкласса…"
            selectedId={form.subclass_id}
            onSelect={(s) => update({ subclass_id: String(s.id) })}
          />
          {form.subclass_id && (
            <div className="mt-4 space-y-3">
              {!subclassDetail && <Hint>Загружаем подкласс…</Hint>}
              {subclassDetail && (
                <>
                  {subclassDetail.description && <p className="text-sm leading-relaxed text-stone-300">{subclassDetail.description}</p>}
                </>
              )}
            </div>
          )}
        </Section>
      )}

      {(raceGranted.length > 0 || bgGranted.length > 0 || choiceCount > 0) && (
        <Section title={classDetail?.name ? `Навыки «${classDetail.name}»` : 'Навыки'}>
          {!classDetail && <Hint>Сначала выберите класс.</Hint>}
          {classDetail && (
            <>
              {(raceGranted.length > 0 || bgGranted.length > 0) && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {[...raceGranted]
                    .sort((a, b) => skillName(a).localeCompare(skillName(b), 'ru'))
                    .map((s) => (
                      <Tag key={`r${s.id}`} tone="good">
                        {skillName(s)} · раса
                      </Tag>
                    ))}
                  {[...bgGranted]
                    .sort((a, b) => skillName(a).localeCompare(skillName(b), 'ru'))
                    .map((s) => (
                      <Tag key={`b${s.id}`} tone="good">
                        {skillName(s)} · предыстория
                      </Tag>
                    ))}
                </div>
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
      )}
    </StepShell>
  )
}
