import { STATS, abilityName, mod } from '@/lib/utils/ability.js'
import { useItems } from '@/features/catalog/queries.js'
import { Section, StepShell } from './StepShell.jsx'

function InfoCard({ label, children }) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-stone-100" title={typeof children === 'string' ? children : undefined}>
        {children}
      </p>
    </div>
  )
}

export default function StepSummary({ stepNo, total, form, lookups, derived }) {
  const { raceDetail, subraceDetail, backgroundDetail, classDetail, subclassDetail, skills } = lookups
  const { data: catalogItems = [] } = useItems()
  const skillsById = new Map((skills ?? []).map((s) => [Number(s.id), s]))
  const chosenSkills = (form.class_skill_ids ?? [])
    .map((id) => skillsById.get(Number(id))?.name)
    .filter(Boolean)
  const savingThrows = (classDetail?.saving_throws ?? []).map((s) => abilityName(s.ability))

  const itemName = (opt) =>
    opt?.item?.name ||
    (opt?.name ? opt.name : undefined) ||
    catalogItems.find((i) => Number(i.id) === Number(opt?.item_id))?.name ||
    (opt?.item_id != null ? `Предмет #${opt.item_id}` : '—')

  const fixedItems = [
    ...(classDetail?.starting_items ?? []).map((it) => ({ ...it, name: itemName(it), source: 'класс' })),
    ...(backgroundDetail?.starting_items ?? []).map((it) => ({ ...it, name: itemName(it), source: 'предыстория' })),
  ]

  const groups = [
    ...(classDetail?.starting_choice_groups ?? classDetail?.choice_groups ?? []).map((g) => ({
      ...g,
      source: 'class',
      sourceLabel: 'класс',
    })),
    ...(backgroundDetail?.starting_choice_groups ?? backgroundDetail?.choice_groups ?? []).map((g) => ({
      ...g,
      source: 'background',
      sourceLabel: 'предыстория',
    })),
  ]
  const choices = form.starting_choices ?? {}
  const chosenItems = []
  groups.forEach((g, gi) => {
    const key = `${g.source}:${gi}`
    ;(g.options ?? []).forEach((opt) => {
      if ((choices[key] ?? []).includes(Number(opt.id ?? opt.item_id))) {
        chosenItems.push({ name: itemName(opt), quantity: opt.quantity, source: g.sourceLabel, chosen: true })
      }
    })
  })
  const equipment = [...fixedItems, ...chosenItems]

  return (
    <StepShell stepNo={stepNo} total={total} title="Сводка" subtitle="Проверьте героя перед началом игры">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <div className="space-y-6">
          <Section title="Выборы">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <InfoCard label="Имя">{form.name || '—'}</InfoCard>
              <InfoCard label="Раса">
                {raceDetail?.name ?? '—'}
                {subraceDetail?.name ? ` · ${subraceDetail.name}` : ''}
              </InfoCard>
              <InfoCard label="Предыстория">{backgroundDetail?.name ?? '—'}</InfoCard>
              <InfoCard label="Класс">{classDetail?.name ?? '—'}</InfoCard>
              <InfoCard label="Подкласс">{subclassDetail?.name ?? '—'}</InfoCard>
              <InfoCard label="Кость хитов">{derived.dieSides ? `к${derived.dieSides}` : '—'}</InfoCard>
              <InfoCard label="Спасброски">{savingThrows.length ? savingThrows.join(', ') : '—'}</InfoCard>
              <InfoCard label="Навыки">{chosenSkills.length ? chosenSkills.join(', ') : '—'}</InfoCard>
            </div>
          </Section>
        </div>

        <Section title="Сводка характеристик">
          <table className="w-full table-fixed border-separate border-spacing-y-0.5 bg-stone-700/60">
            <tbody>
              {STATS.map((s) => {
                const value = derived.totals[s.code] ?? 10
                const modifier = mod(value)
                return (
                  <tr key={s.code}>
                    <td className="w-3/5 border-l border-stone-700/60 bg-stone-900 px-3 py-2 text-[11px] uppercase tracking-wider text-stone-500">
                      {abilityName(s.code)}
                    </td>
                    <td className="w-1/5 bg-stone-900 py-2 text-center font-display text-xs font-bold text-stone-100">
                      <span className={`${modifier >= 0 ? 'text-gold-light' : 'text-red-400'}`}>
                        {modifier >= 0 ? '+' : ''}
                        {modifier}
                      </span>
                    </td>
                    <td className="w-1/5 border-r border-stone-700/60 bg-stone-900 py-2 text-center font-display text-base font-normal text-stone-300">
                      {value}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Снаряжение" className="mt-6">
        {equipment.length === 0 ? (
          <p className="text-sm text-stone-400">Снаряжение не задано.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {equipment.map((it, i) => (
              <li
                key={i}
                className="flex w-full items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-stone-200 sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]"
              >
                <span className="min-w-0 flex-1 truncate" title={it.name}>
                  {it.name}
                </span>
                {it.quantity > 1 && <span className="shrink-0 font-medium text-ember">×{it.quantity}</span>}
                {it.chosen && (
                  <span className="shrink-0 rounded bg-ember/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-orange-200">
                    выбор
                  </span>
                )}
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-stone-600">{it.source}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </StepShell>
  )
}