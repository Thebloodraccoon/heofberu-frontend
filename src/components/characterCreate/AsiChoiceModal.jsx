import { useState } from 'react'
import { ABILITY_CAP, STATS, abilityName } from '../../utils/ability.js'
import { Button } from '../ui.jsx'
import { Tag } from './StepShell.jsx'

export default function AsiChoiceModal({ level, abilityTotals, feats, featsLoading, onConfirm, onCancel }) {
  const [mode, setMode] = useState('asi')
  const [increases, setIncreases] = useState({})
  const [featId, setFeatId] = useState(null)
  const [increaseId, setIncreaseId] = useState(null)

  const totals = { ...increases }
  const budget = Object.values(totals).reduce((a, b) => a + b, 0)

  const bump = (code, delta) => {
    const current = totals[code] || 0
    const next = current + delta
    if (next < 0 || next > 2) return
    if (delta > 0 && (abilityTotals[code] || 0) + next > ABILITY_CAP) return
    if (delta > 0 && budget + delta > 2) return
    setIncreases({ ...totals, [code]: next })
  }

  const selectedFeat = feats.find((f) => String(f.id) === String(featId))
  const featPrereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (abilityTotals[f.prerequisite_ability] || 0) >= f.prerequisite_minimum_score
  }

  const confirm = () => {
    if (mode === 'asi') {
      const increasesList = Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([code, v]) => ({ ability: code, amount: v }))
      onConfirm({ type: 'ASI', increases: increasesList })
    } else {
      const feat = selectedFeat
      if (!feat) return
      onConfirm({
        type: 'FEAT',
        feat_id: feat.id,
        ability_score_increase_id: increaseId ? Number(increaseId) : null,
      })
    }
  }

  const canConfirm = mode === 'asi' ? budget >= 1 && budget <= 2 : Boolean(selectedFeat)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="fantasy-panel w-full max-w-2xl rounded-lg">
        <div className="border-b border-stone-700/60 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-stone-100">Улучшение характеристик</h3>
          <p className="mt-0.5 text-sm text-stone-400">
            Уровень {level}: выберите улучшение характеристик или черту вместо него.
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('asi')}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                mode === 'asi' ? 'bg-ember text-white' : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
              }`}
            >
              Улучшение характеристик
            </button>
            <button
              type="button"
              onClick={() => setMode('feat')}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                mode === 'feat' ? 'bg-ember text-white' : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
              }`}
            >
              Черта
            </button>
          </div>

          {mode === 'asi' && (
            <>
              <div className="space-y-1.5">
                {STATS.map((s) => {
                  const inc = totals[s.code] || 0
                  const final = (abilityTotals[s.code] || 0) + inc
                  return (
                    <div key={s.code} className="flex items-center justify-between gap-3 rounded border border-stone-700/40 bg-stone-800/40 px-3 py-2">
                      <span className="text-sm text-stone-200">{abilityName(s.code)}</span>
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-right text-sm text-stone-400">
                          {abilityTotals[s.code] || 0} → <b className="text-stone-100">{final}</b>
                        </span>
                        <button
                          type="button"
                          disabled={inc <= 0}
                          onClick={() => bump(s.code, -1)}
                          className="size-7 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-stone-100">{inc}</span>
                        <button
                          type="button"
                          disabled={inc >= 2 || budget >= 2 || final >= ABILITY_CAP}
                          onClick={() => bump(s.code, 1)}
                          className="size-7 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-sm text-stone-400">
                Прибавьте <b className="text-stone-100">1 или 2</b> очка (можно +1 к двум характеристикам). Максимум — 20.
              </p>
            </>
          )}

          {mode === 'feat' && (
            <>
              {featsLoading && <p className="py-6 text-center text-sm text-stone-400">Загружаем черты…</p>}
              {!featsLoading && feats.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">Черты не найдены.</p>
              )}
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {feats.map((f) => {
                  const ok = featPrereqOk(f)
                  const selected = String(f.id) === String(featId)
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={!ok}
                      onClick={() => {
                        setFeatId(f.id)
                        setIncreaseId(null)
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        selected
                          ? 'border-ember/80 bg-ember/10'
                          : ok
                            ? 'border-stone-700/50 bg-stone-800/40 hover:border-ember/40'
                            : 'border-stone-800 bg-stone-900/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-stone-100">{f.name}</span>
                        {!ok && (
                          <Tag tone="bad">
                            Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                          </Tag>
                        )}
                      </div>
                      {f.description && <p className="mt-1 text-xs text-stone-400">{f.description}</p>}
                      {(f.ability_score_increases ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(f.ability_score_increases ?? []).map((ai) => (
                            <span
                              key={ai.id}
                              className={`rounded border px-2 py-0.5 text-xs ${
                                String(ai.id) === String(increaseId) && selected
                                  ? 'border-ember bg-ember/20 text-orange-100'
                                  : 'border-stone-700 text-stone-400'
                              }`}
                            >
                              +{ai.amount} {abilityName(ai.ability)}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedFeat && (selectedFeat.ability_score_increases ?? []).length > 0 && (
                <div className="mt-3 rounded border border-stone-700/50 bg-stone-800/40 p-3">
                  <p className="mb-2 text-sm text-stone-300">
                    Черта даёт увеличение характеристик. Выберите вариант:
                  </p>
                  <div className="space-y-1.5">
                    {(selectedFeat.ability_score_increases ?? []).map((ai) => (
                      <label key={ai.id} className="flex cursor-pointer items-center gap-2 text-sm text-stone-200">
                        <input
                          type="radio"
                          name="feat-asi"
                          checked={String(ai.id) === String(increaseId)}
                          onChange={() => setIncreaseId(ai.id)}
                          className="accent-ember"
                        />
                        +{ai.amount} к {abilityName(ai.ability)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-700/60 px-6 py-4">
          <Button variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
          <Button disabled={!canConfirm} onClick={confirm}>
            Применить
          </Button>
        </div>
      </div>
    </div>
  )
}
