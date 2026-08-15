import { Input } from '../ui.jsx'
import {
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  POINT_BUY_MAX,
  POINT_BUY_MIN,
  STANDARD_ARRAY,
  STATS,
  baseDefaults,
  mod,
  roll3d6,
  roll4d6DropLowest,
} from '../../utils/ability.js'
import { OptionCard } from './OptionCard.jsx'
import { Hint, StepShell, Tag } from './StepShell.jsx'

const METHODS = [
  { id: 'manual', label: 'Вручную', desc: 'Значения от 3 до 20' },
  { id: 'array', label: 'Стандартный набор', desc: '15, 14, 13, 12, 10, 8' },
  { id: 'pointbuy', label: 'По очкам (27)', desc: 'Распределение 8–15 по таблице' },
  { id: 'dice4', label: 'Бросок 4d6−1', desc: '4 кости, меньшая отбрасывается' },
  { id: 'dice3', label: 'Бросок 3d6 (хардкор)', desc: '3 кости как выпали' },
]

const all8 = () => Object.fromEntries(STATS.map((s) => [s.key, 8]))
const defaultArray = () => Object.fromEntries(STATS.map((s, i) => [s.key, STANDARD_ARRAY[i]]))
const num = (v) => Number(v) || 0

export default function StepAbilities({ stepNo, total, form, update, derived }) {
  const { bonusByCode, totals } = derived
  const base = { ...baseDefaults(), ...form.ability_base }
  const rolls = form.ability_rolls || {}

  const pickMethod = (id) => {
    const patch = { ability_method: id }
    if (id === 'array') {
      patch.ability_base = defaultArray()
      patch.ability_rolls = {}
    } else if (id === 'pointbuy') {
      patch.ability_base = all8()
      patch.ability_rolls = {}
    } else if (id === 'dice4' || id === 'dice3') {
      const newRolls = {}
      for (const s of STATS) newRolls[s.key] = id === 'dice4' ? roll4d6DropLowest() : roll3d6()
      patch.ability_rolls = newRolls
      patch.ability_base = Object.fromEntries(STATS.map((s) => [s.key, newRolls[s.key].value]))
    } else {
      patch.ability_rolls = {}
    }
    update(patch)
  }

  const setBase = (key, raw) => {
    update({ ability_base: { ...base, [key]: num(raw) } })
  }

  const setBaseClamped = (key, raw, min, max) => {
    update({ ability_base: { ...base, [key]: Math.min(max, Math.max(min, num(raw))) } })
  }

  const pointCost = (v) => POINT_BUY_COST[v] ?? 0
  const totalCost = STATS.reduce((sum, s) => sum + pointCost(base[s.key]), 0)
  const remaining = POINT_BUY_BUDGET - totalCost

  const usedValues = new Set(STATS.map((s) => base[s.key]))

  const rerollDice = () => {
    const method = form.ability_method
    if (method !== 'dice4' && method !== 'dice3') return
    const newRolls = {}
    for (const s of STATS) newRolls[s.key] = method === 'dice4' ? roll4d6DropLowest() : roll3d6()
    update({
      ability_rolls: newRolls,
      ability_base: Object.fromEntries(STATS.map((s) => [s.key, newRolls[s.key].value])),
    })
  }

  const renderControl = (s) => {
    const method = form.ability_method
    if (method === 'manual' || method === 'dice4' || method === 'dice3') {
      return (
        <Input
          type="number"
          min="3"
          max="20"
          value={base[s.key]}
          onChange={(e) => setBaseClamped(s.key, e.target.value, 3, 20)}
          className="w-20 text-center"
        />
      )
    }
    if (method === 'array') {
      return (
        <select
          value={base[s.key]}
          onChange={(e) => setBase(s.key, Number(e.target.value))}
          className="w-20 rounded border border-stone-700 bg-stone-800/70 px-2 py-2 text-center text-sm text-stone-100 outline-none focus:border-ember"
        >
          {STANDARD_ARRAY.map((v) => (
            <option key={v} value={v} disabled={usedValues.has(v) && base[s.key] !== v}>
              {v}
            </option>
          ))}
        </select>
      )
    }
    if (method === 'pointbuy') {
      const rowCost = pointCost(base[s.key])
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={base[s.key] <= POINT_BUY_MIN}
            onClick={() => setBase(s.key, base[s.key] - 1)}
            className="size-7 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-stone-100">{base[s.key]}</span>
          <button
            type="button"
            disabled={base[s.key] >= POINT_BUY_MAX || remaining <= 0}
            onClick={() => setBase(s.key, base[s.key] + 1)}
            className="size-7 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
          >
            +
          </button>
          <span className="ml-1 w-8 text-xs text-stone-500">{rowCost > 0 ? `${rowCost} очк.` : ''}</span>
        </div>
      )
    }
    return null
  }

  const renderRolls = (s) => {
    const entry = rolls[s.key]
    if (!entry) return null
    const { rolls: dice, value } = entry
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {dice.map((d, i) => (
          <span key={i} className={`flex size-5 items-center justify-center rounded text-[11px] ${i === 0 ? 'bg-stone-800 text-stone-600 line-through' : 'bg-stone-700 text-stone-200'}`}>
            {d}
          </span>
        ))}
        <Tag tone="accent">= {value}</Tag>
      </div>
    )
  }

  return (
    <StepShell stepNo={stepNo} total={total} title="Характеристики" subtitle="Распределите значения между шестью характеристиками">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {METHODS.map((m) => (
          <OptionCard
            key={m.id}
            selected={form.ability_method === m.id}
            onClick={() => pickMethod(m.id)}
            title={m.label}
            subtitle={m.desc}
          />
        ))}
      </div>

      {(form.ability_method === 'dice4' || form.ability_method === 'dice3') && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={rerollDice}
            className="rounded border border-stone-600 px-3 py-1.5 text-sm text-stone-200 hover:bg-stone-800"
          >
            Перебросить кости
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-stone-700/60">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 gap-y-1 bg-stone-800/70 px-4 py-2 text-xs font-medium uppercase tracking-wide text-stone-400">
          <span>Характеристика</span>
          <span>Значение</span>
          <span>Бонус</span>
          <span className="text-right">Итог</span>
          <span className="w-16 text-right">Модиф.</span>
        </div>
        {STATS.map((s) => {
          const bonus = bonusByCode[s.code] || 0
          const total = totals[s.code]
          return (
            <div
              key={s.key}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-4 gap-y-2 border-t border-stone-700/40 px-4 py-2.5 sm:gap-y-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{s.label}</p>
                {(form.ability_method === 'dice4' || form.ability_method === 'dice3') && (
                  <div className="mt-1">{renderRolls(s)}</div>
                )}
              </div>
              <div>{renderControl(s)}</div>
              <div className="w-14 text-sm text-emerald-300">{bonus > 0 ? `+${bonus}` : '—'}</div>
              <div className="w-14 text-right text-lg font-bold text-stone-100">{total}</div>
              <div className="w-16 text-right text-sm text-stone-400">
                {mod(total) > 0 ? '+' : ''}
                {mod(total)}
              </div>
            </div>
          )
        })}
      </div>

      {form.ability_method === 'pointbuy' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <Tag tone={remaining >= 0 ? 'default' : 'bad'}>
            Осталось очков: {remaining}
          </Tag>
          <Hint>Цена: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9. Потратьте не больше 27.</Hint>
        </div>
      )}
      {form.ability_method === 'manual' && (
        <Hint className="mt-3">Базовые значения от 3 до 20 — до учёта бонусов расы и подрасы.</Hint>
      )}
    </StepShell>
  )
}
