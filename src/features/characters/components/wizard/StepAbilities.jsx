import {
  POINT_BUY_BUDGET,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
  STATS,
  mod,
  pointCost,
  roll3d6,
  roll4d6DropLowest,
} from '@/lib/utils/ability.js'
import { OptionCard } from './OptionCard.jsx'
import { Hint, StepShell, Tag } from './StepShell.jsx'
import { useState } from 'react'

const METHODS = [
  { id: 'array', label: 'Стандартный набор', desc: '15, 14, 13, 12, 10, 8' },
  { id: 'pointbuy', label: 'По очкам (27)', desc: 'Значения 8–15 по цене' },
  { id: 'dice4', label: 'Бросок 4d6', desc: '4 кубика, минус меньшее значение' },
  { id: 'dice3', label: 'Бросок 3d6 (хардкор)', desc: '3 кубика как выпали' },
]

const all8 = () => Object.fromEntries(STATS.map((s) => [s.key, 8]))
const num = (v) => Number(v) || 0

const notifyRolls = (onRoll, newRolls) => {
  for (const s of STATS) {
    const entry = newRolls[s.key]
    if (entry) onRoll?.({ title: s.label, dice: entry.rolls, total: entry.value })
  }
}

export default function StepAbilities({ stepNo, total, form, update, derived, onRoll }) {
  const { bonusByCode, totals } = derived
  const method = form.ability_method
  const rolls = form.ability_rolls || {}
  const sources = form.ability_sources || {}
  const [active, setActive] = useState(null)

  const remaining =
    POINT_BUY_BUDGET - STATS.reduce((sum, s) => sum + pointCost(num(form.ability_base?.[s.key])), 0)

  const pickMethod = (id) => {
    const patch = { ability_method: id, ability_sources: {} }
    if (id === 'array') {
      patch.ability_base = {}
      patch.ability_rolls = {}
    } else if (id === 'pointbuy') {
      patch.ability_base = all8()
      patch.ability_rolls = {}
    } else if (id === 'dice4' || id === 'dice3') {
      const newRolls = {}
      for (const s of STATS) newRolls[s.key] = id === 'dice4' ? roll4d6DropLowest() : roll3d6()
      patch.ability_rolls = newRolls
      patch.ability_base = {}
      notifyRolls(onRoll, newRolls)
    } else {
      patch.ability_rolls = {}
    }
    setActive(null)
    update(patch)
  }

  const rerollDice = () => {
    if (method !== 'dice4' && method !== 'dice3') return
    const newRolls = {}
    for (const s of STATS) newRolls[s.key] = method === 'dice4' ? roll4d6DropLowest() : roll3d6()
    update({ ability_rolls: newRolls, ability_base: {}, ability_sources: {} })
    setActive(null)
    notifyRolls(onRoll, newRolls)
  }

  const valueOf = (activeKey) =>
    isDice ? rolls[activeKey]?.value : Number(activeKey)

  const isDice = method === 'dice4' || method === 'dice3'

  const assignStat = (key) => {
    if (active == null) return
    const patch = { ability_base: { ...(form.ability_base ?? {}), [key]: valueOf(active) } }
    if (isDice) patch.ability_sources = { ...sources, [key]: active }
    update(patch)
    setActive(null)
  }

  const unassignStat = (key) => {
    if (form.ability_base?.[key] == null) return
    const next = { ...form.ability_base }
    delete next[key]
    const patch = { ability_base: next }
    if (isDice) {
      const nextSources = { ...sources }
      delete nextSources[key]
      patch.ability_sources = nextSources
    }
    update(patch)
  }

  const stepStat = (key, delta) => {
    const cur = num(form.ability_base?.[key]) || POINT_BUY_MIN
    const next = Math.min(POINT_BUY_MAX, Math.max(POINT_BUY_MIN, cur + delta))
    if (next === cur) return
    if (delta > 0 && remaining < pointCost(next) - pointCost(cur)) return
    update({ ability_base: { ...(form.ability_base ?? {}), [key]: next } })
  }

  const usedValues = new Set(Object.values(form.ability_base ?? {}))
  const consumedSources = new Set(Object.values(sources))

  const pool = (() => {
    if (method === 'array') {
      return STANDARD_ARRAY.map((v) => ({ key: String(v), value: v, used: usedValues.has(v) }))
    }
    if (isDice) {
      return STATS.map((s) => {
        const entry = rolls[s.key]
        if (!entry) return null
        return { key: s.key, value: entry.value, used: consumedSources.has(s.key) }
      }).filter(Boolean)
    }
    return []
  })()

  const renderPoolChip = (item) => (
    <button
      key={item.key}
      type="button"
      disabled={item.used}
      onClick={() => setActive((a) => (a === item.key ? null : item.key))}
      className={`flex min-w-16 flex-col items-center rounded-lg border px-3 py-2 transition ${
        active === item.key
          ? 'border-ember bg-ember/15 shadow-[0_0_0_1px_rgba(212,85,42,0.4)]'
          : 'border-stone-700/60 bg-stone-800/40'
      } ${item.used ? 'cursor-not-allowed opacity-40' : 'hover:border-ember/50 hover:bg-stone-800/70'}`}
    >
      <span className={`text-lg font-bold ${active === item.key ? 'text-stone-100' : 'text-stone-200'}`}>
        {item.value}
      </span>
    </button>
  )

  const subtitle = method === 'pointbuy' ? 'Регулируйте значения счётчиками — бюджет пересчитывается автоматически' : undefined

  return (
    <StepShell stepNo={stepNo} total={total} title="Характеристики" subtitle={subtitle}>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {METHODS.map((m) => (
          <OptionCard
            key={m.id}
            selected={method === m.id}
            onClick={() => pickMethod(m.id)}
            title={m.label}
            subtitle={m.desc}
          />
        ))}
      </div>

      {pool.length > 0 && (
        <div className="rounded-lg border border-stone-700/50 bg-stone-900/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-end gap-3">
            {isDice && (
              <button
                type="button"
                onClick={rerollDice}
                className="rounded border border-stone-600 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-800"
              >
                Перебросить кости
              </button>
            )}
          </div>
          <div data-testid="ability-pool" className="flex flex-wrap gap-2">
            {pool.map(renderPoolChip)}
          </div>
        </div>
      )}

      {method === 'pointbuy' && (
        <div className="flex flex-wrap items-center gap-3">
          <Tag tone={remaining >= 0 ? 'accent' : 'bad'}>Осталось очков: {remaining}</Tag>
          <Hint className="m-0">Цена: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9.</Hint>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-stone-700/60">
        <table className="w-full bg-stone-900/40">
          <thead>
            <tr className="bg-stone-800/70 text-xs font-medium uppercase tracking-wide text-stone-400">
              <th scope="col" className="px-4 py-2 text-left font-medium">Характеристика</th>
              <th scope="col" className="px-2 py-2 text-left font-medium">Значение</th>
              <th scope="col" className="px-2 py-2 text-left font-medium">Бонус</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Итог</th>
              <th scope="col" className="w-16 px-3 py-2 text-right font-medium">Модиф.</th>
            </tr>
          </thead>
          <tbody>
            {STATS.map((s) => {
              const bonus = bonusByCode[s.code] || 0
              const total = totals[s.code]
              const value = form.ability_base?.[s.key]
              return (
                <tr key={s.key} className="border-t border-stone-700/40">
                  <td className="px-4 py-2.5 text-[15px] font-medium text-stone-100">{s.label}</td>
                  <td className="px-2 py-2.5">
                    {method === 'pointbuy' ? (
                      <Stepper
                        value={num(value) || POINT_BUY_MIN}
                        remaining={remaining}
                        label={s.label}
                        onStep={(delta) => stepStat(s.key, delta)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => (value != null ? unassignStat(s.key) : assignStat(s.key))}
                        className={`min-w-16 rounded border px-3 py-2 text-center text-base font-semibold transition ${
                          value != null
                            ? 'border-gold/40 bg-stone-900/60 text-stone-100 hover:border-ember/60'
                            : active == null
                              ? 'border-dashed border-stone-700 text-stone-500'
                              : 'border-ember/60 text-orange-200 hover:bg-ember/10'
                        }`}
                      >
                        {value != null ? value : '—'}
                      </button>
                    )}
                  </td>
                  <td className="w-14 px-2 py-2.5 text-sm text-emerald-300">{bonus > 0 ? `+${bonus}` : '—'}</td>
                  <td className="w-14 px-2 py-2.5 text-right text-lg font-bold text-stone-100">{total}</td>
                  <td className="w-16 px-3 py-2.5 text-right text-sm text-stone-300">
                    {mod(total) > 0 ? '+' : ''}
                    {mod(total)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </StepShell>
  )
}

function Stepper({ value, remaining, label, onStep }) {
  const stepUpCost = pointCost(Math.min(POINT_BUY_MAX, value + 1)) - pointCost(value)
  const canStepUp = value < POINT_BUY_MAX && stepUpCost <= remaining
  const canStepDown = value > POINT_BUY_MIN
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Уменьшить ${label}`}
        disabled={!canStepDown}
        onClick={() => onStep(-1)}
        className="flex size-8 items-center justify-center rounded border border-stone-600 bg-stone-800/60 text-base font-bold text-stone-200 transition hover:border-ember/60 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-35"
      >
        −
      </button>
      <span className="min-w-10 text-center text-base font-semibold text-stone-100">{value}</span>
      <button
        type="button"
        aria-label={`Увеличить ${label}`}
        disabled={!canStepUp}
        onClick={() => onStep(1)}
        className="flex size-8 items-center justify-center rounded border border-stone-600 bg-stone-800/60 text-base font-bold text-stone-200 transition hover:border-ember/60 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-35"
      >
        +
      </button>
    </div>
  )
}
