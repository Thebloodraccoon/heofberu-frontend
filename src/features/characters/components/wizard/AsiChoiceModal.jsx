import { useEffect, useState } from 'react'
import { ABILITY_CAP, STATS, abilityName } from '@/lib/utils/ability.js'
import { Button, Input, Skeleton } from '@/components/ui'
import { useAllFeats, useFeatDetail } from '@/features/catalog/queries.js'
import { Tag } from './StepShell.jsx'

export default function AsiChoiceModal({ level, abilityTotals, onConfirm, onCancel }) {
  const [mode, setMode] = useState('asi')
  const [increases, setIncreases] = useState({})
  const [featId, setFeatId] = useState(null)
  const [increaseId, setIncreaseId] = useState(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const featsQ = useAllFeats(debouncedQuery)
  const feats = featsQ.data ?? []

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

  const detailId = featId ?? expandedId
  const detailQ = useFeatDetail(detailId)
  const detail = detailId ? detailQ.data : null

  const selectedFeat = feats.find((f) => String(f.id) === String(featId))
  const viewedFeat = feats.find((f) => String(f.id) === String(expandedId))
  const currentFeat = selectedFeat ?? viewedFeat
  const featPrereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (abilityTotals[f.prerequisite_ability] || 0) >= f.prerequisite_minimum_score
  }
  const featLevelOk = (f) => f.min_level == null || Number(f.min_level) <= Number(level)

  const confirm = () => {
    if (mode === 'asi') {
      const increasesList = Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([code, v]) => ({ ability: code, amount: v }))
      onConfirm({ type: 'ASI', increases: increasesList })
    } else {
      const feat = selectedFeat ?? viewedFeat
      if (!feat) return
      onConfirm({
        type: 'FEAT',
        feat_id: feat.id,
        ability_score_increase_id: increaseId ? Number(increaseId) : null,
      })
    }
  }

  const canConfirm = mode === 'asi' ? budget >= 1 && budget <= 2 : Boolean(currentFeat)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="fantasy-panel w-full max-w-2xl rounded-lg">
        <div className="px-6 py-4">
          <h3 className="font-display text-lg font-bold text-stone-100">Улучшение характеристик</h3>
          <p className="mt-0.5 text-sm text-stone-400">Уровень {level}: вы на развилке — у вас есть выбор.</p>
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
              <div className="mb-3">
                <Input
                  type="search"
                  placeholder="Поиск черты..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {featsQ.isFetching && feats.length === 0 && (
                <div className="space-y-2 py-2" aria-busy="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="space-y-1.5 rounded-lg border border-stone-700/60 p-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3.5 w-1/2" />
                    </div>
                  ))}
                </div>
              )}
              {!featsQ.isFetching && feats.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">
                  {debouncedQuery ? 'Ничего не найдено по запросу.' : 'Черты не найдены.'}
                </p>
              )}
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {feats.map((f) => {
                  const ok = featPrereqOk(f) && featLevelOk(f)
                  const selected = String(f.id) === String(featId)
                  const expanded = String(expandedId) === String(f.id)
                  const rowDetail = expanded ? detail : null
                  return (
                    <div
                      key={f.id}
                      className={`rounded-lg border p-3 transition ${
                        selected ? 'border-ember/80 bg-ember/10' : ok ? 'border-stone-700/50 bg-stone-800/40' : 'border-stone-800 bg-stone-900/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          disabled={!ok}
                          onClick={() => {
                            setFeatId(f.id)
                            setIncreaseId(null)
                          }}
                          className={`min-w-0 flex-1 rounded text-left font-medium text-stone-100 ${ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {f.name}
                        </button>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {(f.ability_score_increases ?? []).length > 0 && (
                            <Tag tone="good">улучшение характеристики</Tag>
                          )}
                          {!featLevelOk(f) && <Tag tone="bad">С уровня {f.min_level}</Tag>}
                          {!featPrereqOk(f) && (
                            <Tag tone="bad">
                              Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                            </Tag>
                          )}
                          <button
                            type="button"
                            aria-label={`Посмотреть: ${f.name}`}
                            onClick={() => setExpandedId(expanded ? null : f.id)}
                            className="rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800"
                          >
                            Посмотреть
                          </button>
                        </span>
                      </div>
                      {expanded && (
                        <div className="mt-2 border-t border-stone-700/50 pt-2">
                          {detailQ.isFetching && !rowDetail ? (
                            <div className="space-y-1.5 py-1" aria-busy="true">
                              <Skeleton className="h-3.5 w-full" />
                              <Skeleton className="h-3.5 w-2/3" />
                            </div>
                          ) : (
                            <>
                              {(rowDetail?.ability_score_increases ?? []).length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1.5">
                                  {rowDetail.ability_score_increases.map((ai) => (
                                    <span
                                      key={ai.id}
                                      className="rounded border border-emerald-700/60 bg-emerald-900/30 px-2 py-0.5 text-xs text-emerald-200"
                                    >
                                      +{ai.amount} {abilityName(ai.ability)}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {rowDetail?.description ? (
                                <p className="whitespace-pre-line text-xs text-stone-300">{rowDetail.description}</p>
                              ) : (
                                <p className="text-xs italic text-stone-500">Описание отсутствует.</p>
                              )}
                              {rowDetail?.prerequisite_description && (
                                <p className="mt-1 text-xs text-stone-400">{rowDetail.prerequisite_description}</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {currentFeat && ((detail?.ability_score_increases ?? currentFeat.ability_score_increases) ?? []).length > 0 && (
                <div className="mt-3 rounded border border-stone-700/50 bg-stone-800/40 p-3">
                  <p className="mb-2 text-sm text-stone-300">Черта даёт увеличение характеристик. Выберите вариант:</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {(detail?.ability_score_increases ?? currentFeat.ability_score_increases ?? []).map((ai) => {
                      const checked = String(ai.id) === String(increaseId)
                      return (
                        <label
                          key={ai.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                            checked
                              ? 'border-ember/80 bg-ember/10 text-orange-100'
                              : 'border-stone-700 bg-stone-800/50 text-stone-200 hover:border-ember/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="feat-asi"
                            checked={checked}
                            onChange={() => {
                              setIncreaseId(ai.id)
                              setFeatId(currentFeat.id)
                            }}
                            className="accent-ember"
                          />
                          +{ai.amount} к {abilityName(ai.ability)}
                        </label>
                      )
                    })}
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
