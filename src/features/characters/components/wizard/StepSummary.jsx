import { STATS, abilityName, mod } from '@/lib/utils/ability.js'
import { useItems } from '@/features/catalog/queries.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'

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

export default function StepSummary({ stepNo, total, form, update, lookups, derived }) {
  const { raceDetail, subraceDetail, backgroundDetail, classDetail, subclassDetail, skills } = lookups
  const { data: catalogItems = [] } = useItems()
  const itemName = (opt) =>
    opt?.item?.name ??
    catalogItems.find((i) => Number(i.id) === Number(opt.item_id))?.name ??
    `Предмет #${opt.item_id}`

  const skillsById = new Map((skills ?? []).map((s) => [Number(s.id), s]))
  const chosenSkills = (form.class_skill_ids ?? [])
    .map((id) => skillsById.get(Number(id))?.name)
    .filter(Boolean)
  const savingThrows = (classDetail?.saving_throws ?? []).map((s) => abilityName(s.ability))

  const classItems = classDetail?.starting_items ?? []
  const bgItems = backgroundDetail?.starting_items ?? []
  const choices = form.starting_choices ?? {}

  // Группы «выбери-себе-из-N» отдельно для класса и предыстории. Храним
  // выбранными id самих опций (opt.id — SourceItemChoiceOption.id): именно их
  // ожидает бэкенд в item_choice_ids при создании персонажа.
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

  const toggle = (source, gi, optId, pickCount) => {
    const key = `${source}:${gi}`
    const cur = choices[key] ?? []
    const has = cur.includes(optId)
    let next
    if (has) next = cur.filter((x) => x !== optId)
    else if (cur.length >= pickCount) return
    else next = [...cur, optId]
    update({ starting_choices: { ...choices, [key]: next } })
  }

  const fixedItems = [
    ...classItems.map((it) => ({ ...it, source: 'класс' })),
    ...bgItems.map((it) => ({ ...it, source: 'предыстория' })),
  ]

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

          <Section title="Стартовое снаряжение">
            {fixedItems.length === 0 ? (
              <Hint>Снаряжение не задано.</Hint>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {fixedItems.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/60 px-3 py-2 text-sm text-emerald-300"
                  >
                    <span className="min-w-0 flex-1 truncate" title={itemName(it)}>
                      {itemName(it)}
                    </span>
                    {it.quantity > 1 && <span className="shrink-0 font-medium text-ember">×{it.quantity}</span>}
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-stone-600">{it.source}</span>
                  </li>
                ))}
              </ul>
            )}

            {groups.length > 0 && (
              <div className="mt-4 space-y-3">
                {groups.map((g, gi) => {
                  const opts = g.options ?? []
                  const pick = Number(g.pick_count) || 1
                  const key = `${g.source}:${gi}`
                  const chosen = choices[key] ?? []
                  return (
                    <div key={key} className="rounded-lg border border-stone-700/60 bg-stone-900/50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
                          Выберите снаряжение <span className="normal-case text-stone-500">({g.sourceLabel})</span>
                        </p>
                        <Tag tone={chosen.length >= pick ? 'good' : 'default'}>
                          {chosen.length}/{pick}
                        </Tag>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {opts.map((opt) => {
                          const optId = Number(opt.id ?? opt.item_id)
                          const on = chosen.includes(optId)
                          return (
                            <button
                              key={optId}
                              type="button"
                              disabled={!on && chosen.length >= pick}
                              onClick={() => toggle(g.source, gi, optId, pick)}
                              className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                on
                                  ? 'border-ember/70 bg-ember/10'
                                  : 'border-stone-700/60 bg-stone-800/40 hover:border-ember/40'
                              }`}
                            >
                              <span
                                className={`min-w-0 flex-1 truncate ${on ? 'text-emerald-200' : 'text-emerald-300/80'}`}
                                title={itemName(opt)}
                              >
                                {itemName(opt)}
                              </span>
                              {opt.quantity > 1 && <span className="shrink-0 text-xs text-ember">×{opt.quantity}</span>}
                              <span
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                                  on ? 'border-ember bg-ember text-white' : 'border-stone-600 text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>

        <Section title="Сводка характеристик">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {STATS.map((s) => {
              const value = derived.totals[s.code] ?? 10
              const modifier = mod(value)
              return (
                <div key={s.code} className="flex items-center justify-between rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-stone-500">{abilityName(s.code)}</p>
                  <p className="font-display text-base font-bold text-stone-100">
                    {value}
                    <span className={`ml-1.5 text-sm font-normal ${modifier >= 0 ? 'text-gold-light' : 'text-red-400'}`}>
                      {modifier >= 0 ? '+' : ''}
                      {modifier}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </StepShell>
  )
}