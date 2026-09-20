import { useEffect, useState } from 'react'
import { ABILITY_CAP, STATS, abilityName, mod } from '@/lib/utils/ability.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { Button, Input, RichText, Select, Skeleton } from '@/components/ui'
import { useAllFeats, useFeatDetail, useSkills, useSpells } from '@/features/catalog/queries.js'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { describeEffectBundle } from '@/lib/utils/effectBundle.js'
import { Tag } from './StepShell.jsx'

// Опции увеличения характеристик у черты приходят в деталях как группа
// choice_groups с choice_type === 'ABILITY_SCORE' (см. choice_groups[].options[].ability_effects),
// а не отдельным полем ability_score_increases — раскладываем их в тот же
// плоский вид {id, ability, amount}, которым уже пользуется остальной UI.
const abilityGroupOptions = (source) => {
  const group = (source?.choice_groups ?? []).find((g) => g.choice_type === 'ABILITY_SCORE')
  if (!group) return []
  return (group.options ?? [])
    .map((o) => {
      const effect = (o.ability_effects ?? [])[0]
      return effect ? { id: o.id, ability: effect.ability, amount: effect.amount } : null
    })
    .filter(Boolean)
}

// Черта может открывать не только выбор увеличения характеристик, но и любые
// другие группы (навыки, заклинания и т.п.) — бэк требует ответы на ВСЕ группы
// в одном запросе level-up/rebuild, иначе отвечает 422 GrantChoiceRequiredException.
// Отдельно эти группы уже выводит PendingChoicesModal (после гранта), но здесь
// нужно ответить на них ДО подтверждения, поэтому доводим игрока по ним сразу.
const otherChoiceGroups = (source) => (source?.choice_groups ?? []).filter((g) => g.choice_type !== 'ABILITY_SCORE')

const CHOICE_TYPE_LABELS = {
  SKILL: 'Навык',
  SAVING_THROW: 'Спасбросок',
  ARMOR: 'Доспехи',
  WEAPON: 'Оружие',
  SPELL: 'Заклинание',
}

export default function AsiChoiceModal({
  level,
  abilityTotals,
  grantedFeatIds = [],
  onConfirm,
  onCancel,
}) {
  const [mode, setMode] = useState('asi')
  const [increases, setIncreases] = useState({})
  const [featId, setFeatId] = useState(null)
  const [increaseId, setIncreaseId] = useState(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  // Ответы на группы выбора черты, отличные от ABILITY_SCORE — по choice_group_id.
  const [otherAnswers, setOtherAnswers] = useState({})

  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const { data: spellsCatalog = [] } = useSpells({ size: 100 })
  const effectNames = {
    skillNames: Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name])),
    spellNames: Object.fromEntries(spellsCatalog.map((s) => [s.id, s.name])),
  }

  const ownedFeatIds = new Set(grantedFeatIds.map((id) => Number(id)))

  const switchMode = (next) => {
    if (next !== mode) {
      // Переключение на «Улучшение характеристик» сбрасывает выбор черты.
      if (next === 'asi') {
        setFeatId(null)
        setIncreaseId(null)
        setExpandedId(null)
        setQuery('')
        setDebouncedQuery('')
        setOtherAnswers({})
      }
      setMode(next)
    }
  }

  const selectFeat = (f, opts) => {
    setFeatId(f.id)
    setIncreaseId(opts.length === 1 ? opts[0].id : null)
    setOtherAnswers({})
  }

  const otherGroupAnswer = (groupId) => otherAnswers[groupId] ?? []
  const isOtherOptionSelected = (groupId, optionId) =>
    otherGroupAnswer(groupId).some((a) => a.choice_option_id === optionId)
  const toggleOtherOption = (group, option) => {
    setOtherAnswers((prev) => {
      const list = prev[group.id] ?? []
      if (list.some((a) => a.choice_option_id === option.id)) {
        return { ...prev, [group.id]: list.filter((a) => a.choice_option_id !== option.id) }
      }
      const next = group.pick_count === 1 ? [] : list
      if (next.length >= group.pick_count) return prev
      return { ...prev, [group.id]: [...next, { choice_option_id: option.id, skill_id: null, spell_id: null }] }
    })
  }
  const patchOtherAnswer = (groupId, optionId, patch) =>
    setOtherAnswers((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((a) => (a.choice_option_id === optionId ? { ...a, ...patch } : a)),
    }))
  const otherGroupComplete = (group) => {
    const list = otherGroupAnswer(group.id)
    if (list.length !== group.pick_count) return false
    return list.every((a) => {
      const opt = (group.options ?? []).find((o) => o.id === a.choice_option_id)
      if (!opt) return false
      if (opt.needs_skill && a.skill_id == null) return false
      if (opt.needs_spell && a.spell_id == null) return false
      return true
    })
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const featsQ = useAllFeats(debouncedQuery)
  const feats = featsQ.data ?? []

  // Черты, уже взятые персонажем, на выбор не выводим.
  const available = feats.filter((f) => !ownedFeatIds.has(Number(f.id)))

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

  const rawSelectedFeat = feats.find((f) => String(f.id) === String(featId))
  // Черта могла перестать быть доступной уже после выбора (например, каталог
  // изменили под ногами) — такой выбор нельзя ни показывать выбранным, ни
  // подтверждать.
  const selectedFeat = rawSelectedFeat && featOk(rawSelectedFeat) ? rawSelectedFeat : null
  const viewedFeat = feats.find((f) => String(f.id) === String(expandedId))
  const currentFeat = selectedFeat ?? viewedFeat

  // detail соответствует f, если по нему сейчас идёт подгрузка деталей — либо он
  // раскрыт (expandedId), либо выбран как черта уровня (featId, тогда detailId
  // берёт его же). Иначе используем то, что уже было в списке черт (там этих
  // полей нет вовсе — список отдаёт только has_choices/has_static_effects).
  const featIncreaseOptions = (f) => {
    if (f == null) return []
    const useDetail = String(expandedId) === String(f.id) || String(featId) === String(f.id)
    const source = useDetail && detail ? detail : f
    return source.ability_score_increases ?? abilityGroupOptions(source)
  }

  const needsIncrease = (featIncreaseOptions(currentFeat)).length > 0

  // Если у выбранной черты ровно один вариант увеличения характеристик —
  // считаем его выбранным автоматически (даже когда он подгружается из деталей позже).
  const singleOption =
    selectedFeat && featIncreaseOptions(selectedFeat).length === 1 ? featIncreaseOptions(selectedFeat)[0].id : null
  const effectiveIncreaseId = singleOption ?? increaseId

  const selectedFeatOtherGroups = otherChoiceGroups(selectedFeat && detail?.id === selectedFeat.id ? detail : selectedFeat)
  const allOtherGroupsComplete = selectedFeatOtherGroups.every(otherGroupComplete)

  const confirm = () => {
    if (mode === 'asi') {
      const increasesList = Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([code, v]) => ({ ability: code, amount: v }))
      onConfirm({ type: 'ASI', increases: increasesList })
    } else {
      const feat = selectedFeat
      if (!feat) return
      const choiceAnswers = selectedFeatOtherGroups.flatMap((g) =>
        otherGroupAnswer(g.id).map((a) => ({
          choice_group_id: g.id,
          choice_option_id: a.choice_option_id,
          ...(a.skill_id != null ? { skill_id: a.skill_id } : {}),
          ...(a.spell_id != null ? { spell_id: a.spell_id } : {}),
        })),
      )
      onConfirm({
        type: 'FEAT',
        feat_id: feat.id,
        ability_score_increase_id: effectiveIncreaseId ? Number(effectiveIncreaseId) : null,
        // Имя поля не задокументировано — бэк уже принимает такой же список
        // под ключом `answers` на PATCH .../features/{id}/choices (см.
        // PendingChoicesModal), поэтому шлём под тем же именем и сюда.
        // Дублируем под choice_answers на случай другого контракта именно
        // у level-up/rebuild — лишние поля бэк должен игнорировать.
        ...(choiceAnswers.length > 0 ? { answers: choiceAnswers, choice_answers: choiceAnswers } : {}),
      })
    }
  }

  // Черта должна быть реально выбрана, а если у неё есть варианты увеличения
  // характеристик или другие группы выбора (навыки, заклинания и т.п.) —
  // все они обязательно должны быть отвечены, иначе бэк отклонит level-up/rebuild
  // с 422 GrantChoiceRequiredException.
  const canConfirm =
    mode === 'asi'
      ? budget >= 1 && budget <= 2
      : Boolean(selectedFeat) &&
        !detailQ.isFetching &&
        (!needsIncrease || effectiveIncreaseId != null) &&
        allOtherGroupsComplete

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm max-sm:p-2">
      <div className="fantasy-panel w-full max-w-2xl rounded-lg max-sm:max-h-[90vh] max-sm:overflow-y-auto">
        <div className="px-6 py-4 max-sm:px-[10px] max-sm:py-[10px]">
          <h3 className="font-display text-lg font-bold text-stone-100">Улучшение характеристик</h3>
          <p className="mt-0.5 text-sm text-stone-400">Уровень {level}: вы на развилке — у вас есть выбор.</p>
        </div>

        <div className="px-6 py-4 max-sm:px-0 max-sm:py-[10px]">
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
                          onClick={() => bump(s.code, -1)}
                          className="size-9 shrink-0 rounded border border-stone-600 text-stone-200 hover:bg-stone-700 disabled:opacity-40 sm:size-8"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-stone-100">{inc}</span>
                        <button
                          type="button"
                          disabled={inc >= 2 || budget >= 2 || final >= ABILITY_CAP}
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
              {!featsQ.isFetching && feats.length > 0 && available.length === 0 && (
                <p className="py-6 text-center text-sm text-stone-400">Все доступные черты уже взяты персонажем.</p>
              )}
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {available.map((f) => {
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
                          onClick={() => selectFeat(f, featIncreaseOptions(f))}
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
              </div>
              {currentFeat && featIncreaseOptions(currentFeat).length > 0 && (
                <div className="mt-3 rounded border border-stone-700/50 bg-stone-800/40 p-3">
                  <p className="mb-2 text-sm text-stone-300">Черта даёт увеличение характеристик. Выберите вариант:</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {featIncreaseOptions(currentFeat).map((ai) => {
                      const checked = String(ai.id) === String(effectiveIncreaseId)
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
                            className="checkbox-base"
                          />
                          +{ai.amount} к {abilityName(ai.ability)}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {selectedFeat &&
                selectedFeatOtherGroups.map((group) => {
                  const typeLabel = CHOICE_TYPE_LABELS[group.choice_type] ?? group.choice_type
                  const list = otherGroupAnswer(group.id)
                  return (
                    <div key={group.id} className="mt-3 rounded border border-stone-700/50 bg-stone-800/40 p-3">
                      <p className="mb-2 text-sm text-stone-300">
                        Черта также требует выбора: {typeLabel} — выберите {group.pick_count} из{' '}
                        {(group.options ?? []).length}
                      </p>
                      <div className="space-y-1.5">
                        {(group.options ?? []).map((option) => {
                          const checked = isOtherOptionSelected(group.id, option.id)
                          const answer = list.find((a) => a.choice_option_id === option.id)
                          return (
                            <div key={option.id}>
                              <label
                                className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                                  checked
                                    ? 'border-ember/80 bg-ember/10 text-orange-100'
                                    : 'border-stone-700 bg-stone-800/50 text-stone-200 hover:border-ember/40'
                                }`}
                              >
                                <input
                                  type={group.pick_count === 1 ? 'radio' : 'checkbox'}
                                  name={`feat-group-${group.id}`}
                                  checked={checked}
                                  onChange={() => toggleOtherOption(group, option)}
                                  className="checkbox-base mt-0.5"
                                />
                                <span>{describeEffectBundle(option, effectNames)}</span>
                              </label>
                              {checked && option.needs_skill && (
                                <div className="mt-1.5">
                                  <Select
                                    value={answer?.skill_id ?? ''}
                                    onChange={(e) =>
                                      patchOtherAnswer(group.id, option.id, {
                                        skill_id: e.target.value ? Number(e.target.value) : null,
                                      })
                                    }
                                    placeholder="Выберите навык…"
                                  >
                                    {skillsCatalog.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              )}
                              {checked && option.needs_spell && (
                                <div className="mt-1.5">
                                  <Select
                                    value={answer?.spell_id ?? ''}
                                    onChange={(e) =>
                                      patchOtherAnswer(group.id, option.id, {
                                        spell_id: e.target.value ? Number(e.target.value) : null,
                                      })
                                    }
                                    placeholder="Выберите заклинание…"
                                  >
                                    {spellsCatalog.map((sp) => (
                                      <option key={sp.id} value={sp.id}>
                                        {sp.name}
                                      </option>
                                    ))}
                                  </Select>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-700/60 px-6 py-4 max-sm:px-[10px] max-sm:py-[10px]">
          <Button variant="ghost" className="max-sm:flex-1" onClick={onCancel}>
            Отмена
          </Button>
          <Button className="max-sm:flex-1" disabled={!canConfirm} onClick={confirm}>
            Применить
          </Button>
        </div>
      </div>
    </div>
  )
}
