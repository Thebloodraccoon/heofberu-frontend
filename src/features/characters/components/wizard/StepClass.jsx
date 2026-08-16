import { Input, Select } from '@/components/ui'
import { OptionCard } from './OptionCard.jsx'
import { Hint, Panel, StepShell, Tag } from './StepShell.jsx'

const asNum = (v) => Number(v) || 0

export default function StepClass({ stepNo, total, form, update, lookups, derived }) {
  const { dieSides, conMod, hpLevel1, avgGain } = derived
  const classDetail = lookups.classDetail
  const subclassDetail = lookups.subclassDetail
  const selectedClass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const level = asNum(form.level)
  const subclasses = classDetail?.subclasses ?? []

  const setLevel = (raw) => {
    const v = Math.min(20, Math.max(1, asNum(raw)))
    update({ level: String(v) })
  }

  const setHpMode = (mode) => {
    const patch = { hp_mode: mode }
    if (mode === 'manual') {
      const manual = { ...(form.manual_hp || {}) }
      for (let l = 2; l <= level; l++) {
        if (manual[l] === undefined || manual[l] === '') manual[l] = avgGain
      }
      patch.manual_hp = manual
    }
    update(patch)
  }

  const setManualGain = (l, raw) => {
    const value = Math.min(dieSides + conMod, Math.max(1, asNum(raw)))
    update({ manual_hp: { ...(form.manual_hp || {}), [l]: value } })
  }

  const classFeatures = (classDetail?.features ?? []).filter((f) => f.level == null || f.level <= level)
  const spellSlots = (classDetail?.spell_slot_progression ?? []).filter((s) => s.class_level <= level)

  const slotSummary = {}
  for (const row of spellSlots) {
    slotSummary[row.spell_level] = row.slots
  }
  const slotEntries = Object.entries(slotSummary).filter(([, n]) => n > 0)

  return (
    <StepShell stepNo={stepNo} total={total} title="Класс" subtitle="Класс, подкласс, уровень и хиты">
      <Panel title="Класс">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {(lookups.classes ?? []).map((c) => (
            <OptionCard
              key={c.id}
              selected={String(c.id) === String(form.class_id)}
              onClick={() => update({ class_id: String(c.id), subclass_id: '' })}
              title={c.name}
              subtitle={c.hit_dice ? `Кость хитов к${c.hit_dice.replace('D', '')}` : ''}
            />
          ))}
        </div>
        {selectedClass && !classDetail && <Hint>Загружаем класс…</Hint>}
        {classDetail && (
          <div className="mt-3 space-y-2 border-t border-stone-700/60 pt-3">
            {classDetail.description && <p className="text-sm text-stone-400">{classDetail.description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {classDetail.hit_dice && <Tag>Кость хитов: к{classDetail.hit_dice.replace('D', '')}</Tag>}
              {(classDetail.saving_throws ?? []).map((s) => (
                <Tag key={s.ability} tone="accent">
                  Спасбросок: {s.ability}
                </Tag>
              ))}
              {(classDetail.primary_abilities ?? []).map((a) => (
                <Tag key={a.ability} tone="dim">
                  Основная: {a.ability}
                </Tag>
              ))}
              {classDetail.skill_choice_count > 0 && <Tag>Навыков на выбор: {classDetail.skill_choice_count}</Tag>}
              {classDetail.spellcasting_ability && <Tag>Заклинатель: {classDetail.spellcasting_ability}</Tag>}
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
            {classFeatures.length > 0 && (
              <div className="space-y-1.5">
                {(classFeatures ?? []).map((f) => (
                  <div key={f.id} className="rounded border border-stone-700/50 bg-stone-800/40 p-2.5">
                    <p className="text-sm font-medium text-stone-100">
                      {f.name}
                      {f.level != null && <span className="ml-2 text-xs font-normal text-stone-500">ур. {f.level}</span>}
                    </p>
                    {f.description && <p className="mt-0.5 text-xs text-stone-400">{f.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {subclasses.length > 0 && (
        <Panel title="Подкласс (необязательно)">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="mt-3 space-y-2 border-t border-stone-700/60 pt-3">
              {!subclassDetail && <Hint>Загружаем подкласс…</Hint>}
              {subclassDetail && (
                <>
                  {subclassDetail.archetype_group_name && (
                    <Tag tone="accent">{subclassDetail.archetype_group_name}</Tag>
                  )}
                  {subclassDetail.description && <p className="text-sm text-stone-400">{subclassDetail.description}</p>}
                  {(subclassDetail.features ?? []).length > 0 && (
                    <div className="space-y-1.5">
                      {(subclassDetail.features ?? []).map((f) => (
                        <div key={f.id} className="rounded border border-stone-700/50 bg-stone-800/40 p-2.5">
                          <p className="text-sm font-medium text-stone-100">
                            {f.name}
                            {f.level != null && (
                              <span className="ml-2 text-xs font-normal text-stone-500">ур. {f.level}</span>
                            )}
                          </p>
                          {f.description && <p className="mt-0.5 text-xs text-stone-400">{f.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Panel>
      )}

      <Panel title="Уровень">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={form.level} onChange={(e) => setLevel(e.target.value)} className="w-32">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          {level >= 4 && (
            <Hint>
              На уровнях {[4, 8, 12, 16, 19].filter((l) => l <= level).join(', ')} потребуется выбрать улучшение
              характеристик или черту.
            </Hint>
          )}
        </div>
      </Panel>

      <Panel title={`Хиты за уровни 2–${level > 1 ? level : ''}`}>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-stone-300">
          <span>Уровень 1: к{dieSides} + {conMod} = <b className="text-stone-100">{hpLevel1}</b> HP</span>
          <span className="text-stone-500">Среднее за уровень: {avgGain} HP</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <OptionCard
            selected={form.hp_mode === 'average'}
            onClick={() => setHpMode('average')}
            title="Среднее"
            subtitle={`+${avgGain} HP за каждый уровень`}
          />
          <OptionCard
            selected={form.hp_mode === 'roll'}
            onClick={() => setHpMode('roll')}
            title="Броски кубика"
            subtitle={`к${dieSides} + мод. за каждый уровень`}
          />
          <OptionCard
            selected={form.hp_mode === 'manual'}
            onClick={() => setHpMode('manual')}
            title="Вручную"
            subtitle="Задать прибавку на каждом уровне"
          />
        </div>

        {form.hp_mode === 'manual' && level > 1 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: level - 1 }, (_, i) => i + 2).map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 text-stone-400">Уровень {l}</span>
                <Input
                  type="number"
                  min="1"
                  max={dieSides + conMod}
                  value={form.manual_hp?.[l] ?? avgGain}
                  onChange={(e) => setManualGain(l, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
        {form.hp_mode === 'roll' && (
          <Hint className="mt-3">Кости будут брошены на шаге «Сводка» — там же можно перебросить.</Hint>
        )}
      </Panel>
    </StepShell>
  )
}
