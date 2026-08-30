import { useState } from 'react'
import { AccordionItem } from '@/components/ui'
import { abilityName } from '@/lib/utils/ability.js'
import { armorProficiencyLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { Hint, Section, StepShell } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'

export default function StepClass({ stepNo, total, form, update, lookups }) {
  const [openFeature, setOpenFeature] = useState(null)
  const classDetail = lookups.classDetail
  const subclassDetail = lookups.subclassDetail
  const selectedClass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const subclasses = classDetail?.subclasses ?? []
  const selectedSub = subclasses.find((s) => String(s.id) === String(form.subclass_id))

  const subDescription = subclassDetail?.description ?? selectedSub?.description ?? ''
  const subFeatures = subclassDetail?.features ?? selectedSub?.features ?? []

  const spellcasting = classDetail.spellcasting_ability ? abilityName(classDetail.spellcasting_ability) : '—'
  const saves = (classDetail.saving_throws ?? [])
    .map((s) => abilityName(s.ability))
    .filter(Boolean)
  const armor = (classDetail.armor_proficiencies ?? [])
    .map((a) => armorProficiencyLabels[a.armor_type] ?? a.armor_type)
    .filter(Boolean)
  const weapons = (classDetail.weapon_proficiencies ?? [])
    .map((w) => weaponProficiencyLabels[w.weapon_category] ?? w.weapon_category)
    .filter(Boolean)

  const row = (label, value) => (
    <p className="text-sm leading-relaxed">
      <span className="text-stone-500">{label}:</span>{' '}
      <span className="font-medium text-stone-100">{value.length > 0 ? value.join(', ') : '—'}</span>
    </p>
  )

  return (
    <StepShell stepNo={stepNo} total={total} title="Класс" subtitle="Класс, подкласс и что он даёт">
      <Section>
        <PickerGrid
          items={lookups.classes ?? []}
          noSearch
          columns="sm:grid-cols-2 xl:grid-cols-3"
          selectedId={form.class_id}
          onSelect={(c) =>
            update({ class_id: String(c.id), subclass_id: '', class_skill_ids: [], starting_choices: {} })
          }
          subtitleOf={(c) => (c.hit_dice ? `к${c.hit_dice.replace('D', '')}` : undefined)}
        />
        {selectedClass && !classDetail && <Hint className="mt-3">Загружаем класс…</Hint>}
        {classDetail && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5 rounded-lg border border-stone-800 bg-stone-900/50 p-4">
              {row('Характеристика заклинаний', [spellcasting])}
              {row('Спасброски', saves)}
              {row('Владения доспехами', armor)}
              {row('Владения оружием', weapons)}
            </div>
            {(classDetail.starting_items ?? []).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Стартовое снаряжение</p>
                {(classDetail.starting_items ?? []).map((it) => (
                  <p
                    key={it.item_id}
                    className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-sm text-emerald-300"
                  >
                    <span className="min-w-0 flex-1 truncate" title={it.item?.name ?? `Предмет #${it.item_id}`}>
                      {it.item?.name ?? `Предмет #${it.item_id}`}
                    </span>
                    {it.quantity > 1 && <span className="shrink-0 font-medium text-ember">×{it.quantity}</span>}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {subclasses.length > 0 && (
        <Section title="Подкласс (необязательно)">
          <PickerGrid
            items={[{ id: '', name: 'Без подкласса' }, ...subclasses]}
            noSearch
            columns="sm:grid-cols-2 xl:grid-cols-3"
            selectedId={form.subclass_id}
            onSelect={(s) => update({ subclass_id: String(s.id) })}
          />
          {form.subclass_id && (
            <div className="mt-4 space-y-3">
              {!subclassDetail && !selectedSub?.description && subFeatures.length === 0 && (
                <Hint>Загружаем подкласс…</Hint>
              )}
              {subDescription && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{subDescription}</p>
              )}
              {subFeatures.length > 0 && (
                <ul className="flex flex-col gap-[5px]">
                  {subFeatures.map((f) => {
                    const expanded = openFeature === f.id
                    return (
                      <li
                        key={f.id}
                        className="rounded-lg border border-ember/60 bg-ember/5 py-3 pl-[10px] pr-[10px] transition-colors"
                      >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => setOpenFeature(expanded ? null : f.id)}
                          bodyClassName="mt-1 px-[15px]"
                          header={<p className="font-semibold text-ember">{f.name}</p>}
                        >
                          {f.description && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                              {f.description}
                            </p>
                          )}
                        </AccordionItem>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </Section>
      )}
    </StepShell>
  )
}