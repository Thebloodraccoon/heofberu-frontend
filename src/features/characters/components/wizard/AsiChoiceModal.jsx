import { useState } from 'react'
import { createPortal } from 'react-dom'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { ABILITY_CAP, STATS, abilityName, mod } from '@/lib/utils/ability.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { Button, RichText, Skeleton } from '@/components/ui'
import { catalogApi } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import CatalogSearchList from '@/features/catalog/components/CatalogSearchList.jsx'
import { useFeatDetail } from '@/features/catalog/queries.js'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { Tag } from './StepShell.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'

// Здесь черту только выбирают. Все её выборы — увеличение характеристики
// (Устойчивый и т.п.), навыки, заклинания — делаются в одном месте, в
// «Выборах» (PendingChoicesModal), сразу после повышения/ребилда: так у
// выборов один источник истины, а ребилд не заставляет отвечать их заново.
const featHasChoices = (feat, detail) =>
  detail && String(detail.id) === String(feat.id) ? (detail.choice_groups ?? []).length > 0 : Boolean(feat.has_choices)

export default function AsiChoiceModal({
  level,
  abilityTotals,
  grantedFeatIds = [],
  onConfirm,
  onCancel,
  presentation = 'modal',
  busy = false,
}) {
  const [mode, setMode] = useState('asi')
  const [increases, setIncreases] = useState({})
  // Выбранная черта целиком: список подгружается страницами и может смениться поиском.
  const [pickedFeat, setPickedFeat] = useState(null)
  const featId = pickedFeat?.id ?? null
  const [expandedId, setExpandedId] = useState(null)

  const ownedFeatIds = new Set(grantedFeatIds.map((id) => Number(id)))

  const switchMode = (next) => {
    if (next !== mode) {
      // Переключение на «Улучшение характеристик» сбрасывает выбор черты.
      if (next === 'asi') {
        setPickedFeat(null)
        setExpandedId(null)
      }
      setMode(next)
    }
  }

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

  const featPrereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (abilityTotals[f.prerequisite_ability] || 0) >= f.prerequisite_minimum_score
  }
  const featLevelOk = (f) => f.min_level == null || Number(f.min_level) <= Number(level)
  const featOk = (f) => featPrereqOk(f) && featLevelOk(f)

  const rawSelectedFeat = pickedFeat
  // Черта могла перестать быть доступной уже после выбора (например, каталог
  // изменили под ногами) — такой выбор нельзя ни показывать выбранным, ни
  // подтверждать.
  const selectedFeat = rawSelectedFeat && featOk(rawSelectedFeat) ? rawSelectedFeat : null

  const confirm = () => {
    if (busy) return
    if (mode === 'asi') {
      const increasesList = Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([code, v]) => ({ ability: code, amount: v }))
      onConfirm({ type: 'ASI', increases: increasesList })
    } else {
      if (!selectedFeat) return
      onConfirm({ type: 'FEAT', feat_id: selectedFeat.id })
    }
  }

  const canConfirm = mode === 'asi' ? budget >= 1 && budget <= 2 : Boolean(selectedFeat)

  const footer = <>
    <Button variant="ghost" className={presentation === 'drawer' ? undefined : 'max-sm:flex-1'} disabled={busy} onClick={onCancel}>Отмена</Button>
    <Button className={presentation === 'drawer' ? undefined : 'max-sm:flex-1'} disabled={busy || !canConfirm} onClick={confirm}>{busy ? 'Повышаем…' : 'Применить'}</Button>
  </>

  const content = (
    <div className={presentation === 'drawer' ? '' : 'px-6 py-4 max-sm:px-0 max-sm:py-[10px]'}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => switchMode('asi')}
          className={`rounded-full px-4 py-1.5 text-sm transition ${
            mode === 'asi' ? 'bg-ember text-white' : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
          }`}
        >
          Улучшение характеристик
        </button>
        <button
          type="button"
          onClick={() => switchMode('feat')}
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
              const bonus = mod(final)
              return (
                <div key={s.code} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded border border-stone-700/40 bg-stone-800/40 px-3 py-2">
                  <span className="text-sm text-stone-200">{abilityName(s.code)}</span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="w-10 text-center text-sm font-semibold">
                      <b className={bonus >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {bonus >= 0 ? '+' : ''}
                        {bonus}
                      </b>
                    </span>
                    <span className="w-16 text-right text-sm text-stone-400">
                      {abilityTotals[s.code] || 0} → <b className="text-stone-100">{final}</b>
                    </span>
                    <button
                      type="button"
                      disabled={inc <= 0}
                      aria-label={`Уменьшить: ${abilityName(s.code)}`}
                      onClick={() => bump(s.code, -1)}
                      className="size-9 shrink-0 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40 sm:size-8"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold text-stone-100">{inc}</span>
                    <button
                      type="button"
                      disabled={inc >= 2 || budget >= 2 || final >= ABILITY_CAP}
                      aria-label={`Увеличить: ${abilityName(s.code)}`}
                      onClick={() => bump(s.code, 1)}
                      className="size-9 shrink-0 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40 sm:size-8"
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
          {/* Черты, уже взятые персонажем, на выбор не выводим. */}
          <CatalogSearchList
            queryKey={queryKeys.pickers.feats}
            list={catalogApi.feats.list}
            filters={catalog.feats.filters}
            exclude={(f) => ownedFeatIds.has(Number(f.id))}
            placeholder="Поиск черты…"
            label="Поиск черты"
            emptyText="Черты не найдены."
            listClassName={`${presentation === 'drawer' ? 'max-h-[60vh]' : 'max-h-80'} space-y-2 overflow-y-auto pr-1`}
          >
            {(available) => available.map((f) => {
              const ok = featOk(f)
              const selected = ok && String(f.id) === String(featId)
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
                      onClick={() => setPickedFeat(f)}
                      className={`min-w-0 flex-1 rounded text-left font-medium text-stone-100 ${ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      {sentenceCase(f.name)}
                    </button>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {effectBadges(f).map((badge) => (
                        <Tag key={badge.text} tone={badge.tone === 'good' ? 'good' : 'accent'}>
                          {badge.text}
                        </Tag>
                      ))}
                      {f.min_level != null && (
                        <Tag tone={featLevelOk(f) ? 'default' : 'bad'}>с ур. {f.min_level}</Tag>
                      )}
                      {!featPrereqOk(f) && (
                        <Tag tone="bad">
                          Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                        </Tag>
                      )}
                      <button
                        type="button"
                        aria-label={`Посмотреть: ${f.name}`}
                        onClick={() => setExpandedId(expanded ? null : f.id)}
                        title={expanded ? 'Свернуть' : 'Подробнее'}
                        aria-expanded={expanded}
                        className="flex shrink-0 items-center justify-center rounded p-1 text-stone-400 transition hover:text-stone-100"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        >
                          <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                          <RichText
                            value={rowDetail?.description}
                            tail={rowDetail?.effects_summary}
                            empty="Описание отсутствует."
                            className="text-xs text-stone-300"
                          />
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
          </CatalogSearchList>
          {selectedFeat && featHasChoices(selectedFeat, detail) && (
            <p className="mt-4 rounded-lg border border-dashed border-ember/40 bg-ember/5 px-3 py-2 text-sm text-stone-300">
              У черты есть выборы (увеличение характеристики, навыки, заклинания…) — их вы сделаете сразу после
              применения, в «Выборах».
            </p>
          )}
        </>
      )}
    </div>
  )

  if (presentation === 'drawer') {
    return (
      <SheetDrawer title="Улучшение характеристик" subtitle={`Уровень ${level}: выберите улучшение характеристик или черту.`} onClose={() => { if (!busy) onCancel() }} footer={footer}>
        {content}
      </SheetDrawer>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm max-sm:p-2">
      <div className="fantasy-panel popup-panel w-full max-w-2xl rounded-lg max-sm:max-h-[90vh] max-sm:overflow-y-auto">
        <div className="px-6 py-4 max-sm:px-[10px] max-sm:py-[10px]">
          <h3 className="font-display text-lg font-bold text-stone-100">Улучшение характеристик</h3>
          <p className="mt-0.5 text-sm text-stone-400">Уровень {level}: вы на развилке — у вас есть выбор.</p>
        </div>
        {content}
        <div className="flex justify-end gap-2 border-t border-stone-700/60 px-6 py-4 max-sm:px-[10px] max-sm:py-[10px]">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}
