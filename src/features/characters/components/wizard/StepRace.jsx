import { useEffect, useRef, useState } from 'react'
import { abilityName, bonusMap } from '@/lib/utils/ability.js'
import { AccordionItem } from '@/components/ui'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { smoothScrollTo } from './scroll.js'

const sizeLabel = (size) =>
  size === 'TINY'
    ? 'Крошечный'
    : size === 'SMALL'
      ? 'Маленький'
      : size === 'MEDIUM'
        ? 'Средний'
        : size === 'LARGE'
          ? 'Большой'
          : size === 'HUGE'
            ? 'Огромный'
            : 'Гигантский'

export default function StepRace({ stepNo, total, form, update, lookups }) {
  const { raceDetail, raceFeatures, subraceDetail, subraceFeatures } = lookups
  const subraces = raceDetail?.subraces ?? []
  const [openFeatures, setOpenFeatures] = useState(() => new Set())
  const [openSubFeatures, setOpenSubFeatures] = useState(() => new Set())
  const raceDetailRef = useRef(null)
  const subraceDetailRef = useRef(null)
  const raceSelected = useRef(false)
  const subSelected = useRef(false)

  const toggleOpen = (setter, id) =>
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(String(id))) next.delete(String(id))
      else next.add(String(id))
      return next
    })

  useEffect(() => {
    if (raceDetail && raceSelected.current) {
      raceSelected.current = false
      requestAnimationFrame(() => smoothScrollTo(raceDetailRef.current))
    }
  }, [raceDetail])

  useEffect(() => {
    if (subraceDetail && subSelected.current) {
      subSelected.current = false
      requestAnimationFrame(() => smoothScrollTo(subraceDetailRef.current))
    }
  }, [subraceDetail])

  // В списке расы приходят без бонусов — подтягиваем их у выбранной расы
  // из детали, чтобы карточка показывала скорость, размер и бонусы как у подрасы.
  const races = (lookups.races ?? []).map((r) => {
    if (!raceDetail || String(r.id) !== String(form.race_id)) return r
    return {
      ...r,
      speed: raceDetail.speed ?? r.speed,
      size: raceDetail.size ?? r.size,
      ability_bonuses: raceDetail.ability_bonuses ?? r.ability_bonuses,
    }
  })

  return (
    <StepShell stepNo={stepNo} total={total} title="Раса" subtitle="Выберите расу героя">
      <Section>
        <PickerGrid
          items={races}
          noSearch
          columns="sm:grid-cols-2 xl:grid-cols-4"
          selectedId={form.race_id}
          onSelect={(r) => {
            raceSelected.current = true
            update({ race_id: String(r.id), subrace_id: '' })
          }}
        />
        {raceDetail && (
          <div ref={raceDetailRef} className="mt-4 space-y-3 scroll-mt-24">
            {(() => {
              const bonuses = Object.entries(bonusMap(raceDetail.ability_bonuses)).filter(([, v]) => v)
              const hasTags = raceDetail.speed || raceDetail.size || bonuses.length > 0
              return hasTags && (
                <span className="flex flex-wrap gap-1">
                  {raceDetail.speed && <Tag>Скорость: {raceDetail.speed} фт.</Tag>}
                  {raceDetail.size && <Tag>{sizeLabel(raceDetail.size)}</Tag>}
                  {bonuses.map(([code, v]) => (
                    <Tag key={code} tone="accent">
                      {abilityName(code)} +{v}
                    </Tag>
                  ))}
                </span>
              )
            })()}
            {(raceFeatures ?? []).length > 0 && (
              <ul className="flex flex-col gap-[5px]">
                {(raceFeatures ?? []).map((f) => {
                  const expanded = openFeatures.has(String(f.id))
                  return (
                    <li
                      key={f.id}
                      className="rounded-lg border border-stone-700/60 bg-stone-900/60 py-3 pl-[10px] pr-[10px] transition-colors"
                    >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => toggleOpen(setOpenFeatures, f.id)}
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
        {form.race_id && !raceDetail && <Hint className="mt-2">Загружаем расу…</Hint>}
      </Section>

      {subraces.length > 0 && (
        <Section title="Подраса (необязательно)">
          <PickerGrid
            items={[{ id: '', name: 'Без подрасы' }, ...subraces]}
            noSearch
            columns="sm:grid-cols-2 xl:grid-cols-4"
            selectedId={form.subrace_id}
            onSelect={(s) => {
              if (s.id) subSelected.current = true
              update({ subrace_id: String(s.id) })
            }}
          />
          {subraceDetail && (
            <div ref={subraceDetailRef} className="mt-4 space-y-3 scroll-mt-24">
              {(() => {
                const bonuses = Object.entries(bonusMap(subraceDetail.ability_bonuses)).filter(([, v]) => v)
                const hasTags = subraceDetail.speed || subraceDetail.size || bonuses.length > 0
                return hasTags && (
                  <span className="flex flex-wrap gap-1">
                    {subraceDetail.speed && <Tag>Скорость: {subraceDetail.speed} фт.</Tag>}
                    {subraceDetail.size && <Tag>{sizeLabel(subraceDetail.size)}</Tag>}
                    {bonuses.map(([code, v]) => (
                      <Tag key={code} tone="accent">
                        {abilityName(code)} +{v}
                      </Tag>
                    ))}
                  </span>
                )
              })()}
              {(subraceFeatures ?? []).length > 0 && (
                <ul className="flex flex-col gap-[5px]">
                  {(subraceFeatures ?? []).map((f) => {
                    const expanded = openSubFeatures.has(String(f.id))
                    return (
                      <li
                        key={f.id}
                        className="rounded-lg border border-stone-700/60 bg-stone-900/60 py-3 pl-[10px] pr-[10px] transition-colors"
                      >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => toggleOpen(setOpenSubFeatures, f.id)}
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