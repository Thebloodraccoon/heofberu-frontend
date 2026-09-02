import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccordionItem, EmptyState } from '@/components/ui'
import { Hint, Section, StepShell } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'
import { itemName } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'
import { smoothScrollTo } from './scroll.js'

function ItemLink({ entry }) {
  const id = entry?.item_id ?? entry?.id
  const name = entry?.item?.name ?? entry?.name ?? itemName(id)
  if (id == null) return <span>{name}</span>
  return (
    <Link
      to={`/catalog/items/${id}`}
      className="font-medium text-ember/90 no-underline transition hover:text-ember"
    >
      {name}
    </Link>
  )
}

export default function StepBackground({ stepNo, total, form, update, lookups }) {
  const { backgroundDetail } = lookups
  const search = useSearch(lookups.backgrounds ?? [])
  const [openSkills, setOpenSkills] = useState(() => new Set())
  const detailRef = useRef(null)
  const justSelected = useRef(false)

  const toggleOpen = (id) =>
    setOpenSkills((prev) => {
      const next = new Set(prev)
      if (next.has(String(id))) next.delete(String(id))
      else next.add(String(id))
      return next
    })

  useEffect(() => {
    if (backgroundDetail && justSelected.current) {
      justSelected.current = false
      requestAnimationFrame(() => smoothScrollTo(detailRef.current))
    }
  }, [backgroundDetail])

  return (
    <StepShell stepNo={stepNo} total={total} title="Предыстория" subtitle="Кем герой был до начала приключений (необязательно)">
      <Section>
        {(lookups.backgrounds ?? []).length === 0 && <EmptyState text="Предыстории не загружены" />}
        <PickerGrid
          items={[{ id: '', name: 'Без предыстории' }, ...search.filtered]}
          query={search.query}
          onQueryChange={search.setQuery}
          searchPlaceholder="Поиск предыстории по названию и описанию…"
          selectedId={form.background_id}
          onSelect={(b) => {
            if (b.id) justSelected.current = true
            update({ background_id: String(b.id), class_skill_ids: [] })
          }}
        />
        {form.background_id && !backgroundDetail && <Hint className="mt-3">Загружаем предысторию…</Hint>}
        {backgroundDetail && (
          <div ref={detailRef} className="mt-4 space-y-3 scroll-mt-24">
            {(() => {
              const skills = backgroundDetail.granted_skills ?? []
              const features = backgroundDetail.features ?? []
              const entries = [
                ...skills.map((s) => ({ key: `skill-${s.id}`, name: s.name, description: s.description })),
                ...features.map((f) => ({ key: `feature-${f.id}`, name: f.name, description: f.description })),
              ]
              if (entries.length === 0) return null
              return (
                <ul className="flex flex-col gap-[5px]">
                  {entries.map((e) => {
                    const expanded = openSkills.has(e.key)
                    return (
                      <li
                        key={e.key}
                        className="rounded-lg border border-stone-700/60 bg-stone-900/60 py-3 pl-[10px] pr-[10px] transition-colors"
                      >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => toggleOpen(e.key)}
                          bodyClassName="mt-1 px-[5px] lg:px-[15px]"
                          header={<p className="font-semibold text-sm text-stone-100 sm:text-base">{e.name}</p>}
                        >
                          {e.description && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                              {e.description}
                            </p>
                          )}
                        </AccordionItem>
                      </li>
                    )
                  })}
                </ul>
              )
            })()}
            {(backgroundDetail.starting_items ?? []).length > 0 && (
              <>
                <p className="text-sm leading-relaxed text-stone-300">
                  Из прошлого, что осталось за спиной, вы взяли лишь немногое — но оно всегда при вас:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-300">
                  {(backgroundDetail.starting_items ?? []).map((it, i) => (
                    <li key={it.item_id ?? i}>
                      {it.quantity > 1 && <span className="font-medium text-ember">{it.quantity}× </span>}
                      <ItemLink entry={it} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Section>
    </StepShell>
  )
}
