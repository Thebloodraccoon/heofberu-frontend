import { useItems } from '@/features/catalog/queries.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'

export default function StepEquipment({ stepNo, total, form, update, lookups }) {
  const { classDetail, backgroundDetail } = lookups
  const { data: catalogItems = [] } = useItems()
  const itemName = (opt) =>
    opt?.item?.name ??
    catalogItems.find((i) => Number(i.id) === Number(opt.item_id))?.name ??
    `Предмет #${opt.item_id}`

  const classItems = classDetail?.starting_items ?? []
  const bgItems = backgroundDetail?.starting_items ?? []
  const choices = form.starting_choices ?? {}

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
    <StepShell stepNo={stepNo} total={total} title="Снаряжение" subtitle="Выберите стартовое снаряжение героя">
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
    </StepShell>
  )
}
