import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccordionItem, EmptyState, RichText } from '@/components/ui'
import { sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Hint, Section, StepShell } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'
import { itemName, SkillChips } from '@/features/catalog/components/browse/detail/detailHelpers.jsx'
import { smoothScrollTo } from './scroll.js'

const suggestionTypeLabels = {
  PERSONALITY_TRAIT: 'Черта характера',
  IDEAL: 'Идеал',
  BOND: 'Привязанность',
  FLAW: 'Слабость',
}

function SuggestionsPicker({ suggestions, selectedIds, onChange }) {
  const groups = Object.entries(suggestionTypeLabels)
    .map(([type, label]) => [type, label, (suggestions ?? []).filter((s) => s.suggestion_type === type && s.text)])
    .filter(([, , items]) => items.length > 0)

  if (groups.length === 0) return null

  const selected = new Set((selectedIds ?? []).map(String))

  const pickOne = (id) =>
    onChange((prev) => {
      const byType = new Map(groups.map(([type, , items]) => [type, new Set(items.map((s) => String(s.id)))]))
      const type = [...byType.entries()].find(([, ids]) => ids.has(String(id)))?.[0]
      const next = (prev ?? []).filter((pid) => !byType.get(type)?.has(String(pid)))
      next.push(id)
      return next
    })

  const randomize = () => {
    onChange(() => groups.map(([, , items]) => items[Math.floor(Math.random() * items.length)].id))
  }

  return (
    <Section title="Личность">
      <div className="mb-3 flex flex-nowrap items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm leading-relaxed text-stone-300" title="Выберите подходящий вариант из таблицы или бросьте кубик — кнопка «Случайно» решит за все четыре сразу.">
          Выберите подходящий вариант из таблицы или бросьте кубик — кнопка «Случайно» решит за все четыре сразу.
        </p>
        <button
          type="button"
          onClick={randomize}
          className="shrink-0 rounded border border-stone-700 px-2.5 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >Случайно
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {groups.map(([type, label, items]) => (
          <div key={type} className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-900/60">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-12">{`к${items.length}`}</th>
                  <th>{label}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s, i) => {
                  const isSelected = selected.has(String(s.id))
                  return (
                    <tr
                      key={s.id}
                      onClick={() => pickOne(s.id)}
                      className={`cursor-pointer transition ${isSelected ? 'bg-ember/10' : 'hover:bg-stone-800/60'}`}
                    >
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`suggestion-${type}`}
                            checked={isSelected}
                            onChange={() => pickOne(s.id)}
                            className="accent-ember"
                          />
                          {i + 1}
                        </span>
                      </td>
                      <td>
                        <RichText value={s.text} className="inline leading-relaxed" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ItemLink({ entry }) {
  const id = entry?.item_id ?? entry?.id
  const name = sentenceCase(entry?.item?.name ?? entry?.name ?? itemName(id))
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
  const [openFeatures, setOpenFeatures] = useState(() => new Set())
  const detailRef = useRef(null)
  const justSelected = useRef(false)

  const toggleFeature = (id) =>
    setOpenFeatures((prev) => {
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
          <div ref={detailRef} className="mt-4 space-y-5 scroll-mt-24">
            {(backgroundDetail.granted_skills ?? []).length > 0 && (
              <p className="flex flex-wrap items-center gap-2 text-sm leading-relaxed">
                <span className="font-semibold text-stone-100">Владение навыками: </span>
                <SkillChips
                  names={(backgroundDetail.granted_skills ?? [])
                    .map((s) => ({
                      id: s.id ?? s.item_id,
                      __name: skillLabels[s.name] ?? sentenceCase(s.name),
                    }))
                    .sort((a, b) => a.__name.localeCompare(b.__name, 'ru'))}
                />
              </p>
            )}
            {(backgroundDetail.features ?? []).length > 0 && (
              <Section title="Особенности">
                <ul className="flex flex-col gap-[5px]">
                  {(backgroundDetail.features ?? []).map((f) => {
                    const expanded = openFeatures.has(String(f.id))
                    return (
                      <li
                        key={f.id}
                        className="rounded-lg border border-stone-700/60 bg-stone-900/60 py-3 pl-[10px] pr-[10px] transition-colors"
                      >
                        <AccordionItem
                          open={expanded}
                          onToggle={() => toggleFeature(f.id)}
                          bodyClassName="mt-1 px-[5px] lg:px-[15px]"
                          header={<p className="font-semibold text-sm text-stone-100 sm:text-base">{sentenceCase(f.name)}</p>}
                        >
                          {f.description && <RichText value={f.description} />}
                        </AccordionItem>
                      </li>
                    )
                  })}
                </ul>
              </Section>
            )}
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
            <SuggestionsPicker
              suggestions={backgroundDetail.suggestions}
              selectedIds={form.suggestion_ids}
              onChange={(updater) => update({ suggestion_ids: updater(form.suggestion_ids) })}
            />
          </div>
        )}
      </Section>
    </StepShell>
  )
}
