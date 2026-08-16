import { abilityName } from '@/lib/utils/ability.js'
import { OptionCard } from './OptionCard.jsx'
import { Hint, Search, Section, StepShell, Tag } from './StepShell.jsx'
import { useSearch } from './useSearch.js'

const asNum = (v) => Number(v) || 0

export default function StepClass({ stepNo, total, form, update, lookups, derived }) {
  const classDetail = lookups.classDetail
  const subclassDetail = lookups.subclassDetail
  const selectedClass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const subclasses = classDetail?.subclasses ?? []
  const level = asNum(form.level) || 1

  const classSearch = useSearch(lookups.classes ?? [])

  const expertiseBudget = derived.expertiseBudget

  const pool = (classDetail?.available_skills ?? []).filter((s) => s && s.id != null)
  const raceGranted = classDetail ? (lookups.raceDetail?.granted_skills ?? []) : []
  const bgGranted = classDetail ? (lookups.backgroundDetail?.granted_skills ?? []) : []
  const choiceCount = classDetail?.skill_choice_count ?? 0

  const chosen = (form.class_skill_ids ?? []).map(Number)
  const expertise = (form.expertise_ids ?? []).map(Number)

  const findName = (id) => {
    const all = [...pool, ...raceGranted, ...bgGranted]
    return all.find((s) => Number(s.id) === id)?.name
  }

  const toggleChoice = (id) => {
    const has = chosen.includes(id)
    const atLimit = chosen.length >= choiceCount
    if (!has && atLimit) return
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

  const spellSlots = (classDetail?.spell_slot_progression ?? []).filter((s) => s.class_level <= level)

  const slotSummary = {}
  for (const row of spellSlots) {
    slotSummary[row.spell_level] = row.slots
  }
  const slotEntries = Object.entries(slotSummary).filter(([, n]) => n > 0)

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
        <Search
          className="mb-3 max-w-sm"
          placeholder="Поиск класса…"
          value={classSearch.query}
          onChange={classSearch.setQuery}
        />
        <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {classSearch.filtered.map((c) => (
            <OptionCard
              key={c.id}
              selected={String(c.id) === String(form.class_id)}
              onClick={() => update({ class_id: String(c.id), subclass_id: '', class_skill_ids: [], expertise_ids: [] })}
              title={c.name}
              subtitle={c.hit_dice ? `Кость хитов к${c.hit_dice.replace('D', '')}` : ''}
            />
          ))}
          {classSearch.filtered.length === 0 && <Hint>Ничего не найдено.</Hint>}
        </div>
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
              {(classDetail.primary_abilities ?? []).map((a) => (
                <Tag key={a.ability} tone="dim">
                  Основная: {abilityName(a.ability)}
                </Tag>
              ))}
              {classDetail.skill_choice_count > 0 && <Tag>Навыков на выбор: {classDetail.skill_choice_count}</Tag>}
              {classDetail.spellcasting_ability && <Tag>Заклинатель: {abilityName(classDetail.spellcasting_ability)}</Tag>}
            </div>
            {(classDetail.starting_items ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag>Стартовое снаряжение:</Tag>
                {(classDetail.starting_items ?? []).map((it) => (
                  <Tag key={it.item_id} tone="dim">
                    {it.item?.name} {it.quantity > 1 ? `×${it.quantity}` : ''}
                  </Tag>
                ))}
              </div>
            )}
            {slotEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag>Слоты заклинаний:</Tag>
                {slotEntries.map(([spellLevel, n]) => (
                  <Tag key={spellLevel} tone="dim">
                    {spellLevel === 'CANTRIP' ? 'Заговоры' : spellLevel.replace('LEVEL_', '')} ур.: {n}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {subclasses.length > 0 && (
        <Section title="Подкласс (необязательно)">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <OptionCard
              selected={!form.subclass_id}
              onClick={() => update({ subclass_id: '' })}
              title="Без подкласса"
              subtitle="Только основной класс"
            />
            {subclasses.map((s) => (
              <OptionCard
                key={s.id}
                selected={String(s.id) === String(form.subclass_id)}
                onClick={() => update({ subclass_id: String(s.id) })}
                title={s.name}
              />
            ))}
          </div>
          {form.subclass_id && (
            <div className="mt-4 space-y-3">
              {!subclassDetail && <Hint>Загружаем подкласс…</Hint>}
              {subclassDetail && (
                <>
                  {subclassDetail.archetype_group_name && (
                    <Tag tone="accent">{subclassDetail.archetype_group_name}</Tag>
                  )}
                  {subclassDetail.description && <p className="text-sm leading-relaxed text-stone-300">{subclassDetail.description}</p>}
                </>
              )}
            </div>
          )}
        </Section>
      )}

      <Section title={classDetail?.name ? `Навыки класса «${classDetail.name}»` : 'Навыки класса'}>
        {!classDetail && <Hint>Сначала выберите класс.</Hint>}
        {classDetail && choiceCount === 0 && <Hint>У этого класса нет навыков на выбор.</Hint>}
        {classDetail && choiceCount > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <Tag tone={chosen.length >= choiceCount ? 'good' : 'default'}>
                Выбрано: {chosen.length} из {choiceCount}
              </Tag>
              {chosen.length >= choiceCount && <Hint>Доступный лимит выбран.</Hint>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {pool.map((s) => (
                <SkillToggle
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  sub={abilityName(s.ability)}
                  on={chosen.includes(Number(s.id))}
                  disabled={!chosen.includes(Number(s.id)) && chosen.length >= choiceCount}
                  onClick={() => toggleChoice(Number(s.id))}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      {(raceGranted.length > 0 || bgGranted.length > 0) && (
        <Section title="Навыки расы и предыстории">
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
        </Section>
      )}

      {expertiseBudget > 0 && (
        <Section title="Экспертиза">
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
        </Section>
      )}
    </StepShell>
  )
}
