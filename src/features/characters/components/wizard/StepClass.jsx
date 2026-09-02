import { useEffect, useRef, useState } from 'react'
import { AccordionItem } from '@/components/ui'
import { abilityName } from '@/lib/utils/ability.js'
import { armorProficiencyLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { Hint, Section, StepShell } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { smoothScrollTo } from './scroll.js'

export default function StepClass({ stepNo, total, form, update, lookups }) {
  const [openFeatures, setOpenFeatures] = useState(() => new Set())
  const classDetail = lookups.classDetail
  const subclassDetail = lookups.subclassDetail
  const selectedClass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const subclasses = classDetail?.subclasses ?? []
  const selectedSub = subclasses.find((s) => String(s.id) === String(form.subclass_id))

  const subFeatures = subclassDetail?.features ?? selectedSub?.features ?? []

  const classDetailRef = useRef(null)
  const subDetailRef = useRef(null)
  const classSelected = useRef(false)
  const subSelected = useRef(false)

  const toggleOpen = (id) =>
    setOpenFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(String(id))) next.delete(String(id))
      else next.add(String(id))
      return next
    })

  useEffect(() => {
    if (classDetail && classSelected.current) {
      classSelected.current = false
      requestAnimationFrame(() => smoothScrollTo(classDetailRef.current))
    }
  }, [classDetail])

  useEffect(() => {
    if (subclassDetail && subSelected.current) {
      subSelected.current = false
      requestAnimationFrame(() => smoothScrollTo(subDetailRef.current))
    }
  }, [subclassDetail])

  const spellcasting = classDetail?.spellcasting_ability ? abilityName(classDetail.spellcasting_ability) : '—'
  const saves = (classDetail?.saving_throws ?? [])
    .map((s) => abilityName(s.ability))
    .filter(Boolean)
  const armor = (classDetail?.armor_proficiencies ?? [])
    .map((a) => armorProficiencyLabels[a.armor_type] ?? a.armor_type)
    .filter(Boolean)
  const weapons = (classDetail?.weapon_proficiencies ?? [])
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
          onSelect={(c) => {
            classSelected.current = true
            update({ class_id: String(c.id), subclass_id: '', class_skill_ids: [], starting_choices: {} })
          }}
          subtitleOf={(c) => (c.hit_dice ? `к${c.hit_dice.replace('D', '')}` : undefined)}
        />
        {selectedClass && !classDetail && <Hint className="mt-3">Загружаем класс…</Hint>}
        {classDetail && (
          <div ref={classDetailRef} className="mt-4 space-y-3 scroll-mt-24">
            <div className="space-y-1.5 rounded-lg border border-stone-800 bg-stone-900/50 p-4">
              {row('Характеристика заклинаний', [spellcasting])}
              {row('Спасброски', saves)}
              {row('Владения доспехами', armor)}
              {row('Владения оружием', weapons)}
            </div>
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
            onSelect={(s) => {
              if (s.id) subSelected.current = true
              update({ subclass_id: String(s.id) })
            }}
          />
          {form.subclass_id && (
            <div ref={subDetailRef} className="mt-4 space-y-3 scroll-mt-24">
              {!subclassDetail && !selectedSub?.description && subFeatures.length === 0 && (
                <Hint>Загружаем подкласс…</Hint>
              )}
              {subFeatures.length > 0 && (
                <ul className="flex flex-col gap-[5px]">
                  {subFeatures.map((f) => {
                    const expanded = openFeatures.has(String(f.id))
                    return (
                      <li
                        key={f.id}
                        className="rounded-lg border border-stone-700/60 bg-stone-900/60 py-3 pl-[10px] pr-[10px] transition-colors"
                      >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => toggleOpen(f.id)}
                          bodyClassName="mt-1 px-[5px] lg:px-[15px]"
                          header={<p className="font-semibold text-sm text-stone-100 sm:text-base">{f.name}</p>}
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