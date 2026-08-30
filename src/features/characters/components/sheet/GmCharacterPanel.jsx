import { useMemo, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import {
  useCharacterAsiAdjustments,
  useCharacterFeats,
  useCharacterFeatures,
  useCharacterItems,
  useCharacterMaxLevel,
  useCharacterStats,
} from '@/features/characters/queries.js'
import {
  useAllFeats,
  useFeatDetail,
  useFeatures,
  useSkills,
  useCatalogPage,
} from '@/features/catalog/queries.js'
import { ITEM_FILTERS } from '@/features/catalog/components/editor/itemFilters.js'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import Pagination from '@/features/catalog/components/browse/Pagination.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { STATS, abilityByCode, abilityName } from '@/lib/utils/ability.js'
import { Button, ConfirmDialog, ErrorBox, Field, Input, Modal, Select, Skeleton, TextArea } from '@/components/ui'
import { label, sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
      <p className="sheet-section-label !mt-0">{title}</p>
      {children}
    </div>
  )
}

const ABILITY_CODE_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s.code]))

// ГМ может поднимать характеристики выше обычного потолка игрока (до 30).
const GM_ABILITY_CAP = 30

function HpSection({ character, onError, reload }) {
  const [delta, setDelta] = useState('')
  const [tempHp, setTempHp] = useState(null)
  const [maxHp, setMaxHp] = useState(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusy(false)
    }
  }

  // Как в окне хитов персонажа: положительное — лечение, отрицательное — урон.
  const applyDelta = () =>
    run(async () => {
      await charactersApi.hp(character.id, { delta: Number(delta) })
      setDelta('')
    })

  const applyTempHp = () =>
    run(async () => {
      await charactersApi.hp(character.id, { temp_hp: Math.max(0, Number(tempHp)) })
      setTempHp(null)
    })

  const applyMaxHp = () =>
    run(async () => {
      await charactersApi.gmPanel.maxHp(character.id, { max_hp: Number(maxHp) })
      setMaxHp(null)
    })

  const doRest = (type) => run(() => charactersApi.rest(character.id, { type }))

  return (
    <Section title="Хиты и отдых">
      <div className="text-center">
        <p className="font-display text-3xl font-bold text-stone-100">
          {character.current_hp}
          <span className="text-base font-normal text-stone-400"> / {character.max_hp}</span>
        </p>
        {character.temp_hp > 0 && (
          <p className="mt-1 text-xs text-emerald-300">Временные ХП: +{character.temp_hp}</p>
        )}
        <p className="mt-1 text-xs text-stone-500">Кость хитов: {character.hit_dice || '—'}</p>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <Input
          type="number"
          placeholder="Введите число"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          title="Положительное — лечение, отрицательное — урон"
        />
        <button type="button" className="sheet-btn sheet-btn_primary" disabled={busy || delta === ''} onClick={applyDelta}>
          Применить
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="sheet-btn" disabled={busy} onClick={() => doRest('short')}>
          Короткий отдых
        </button>
        <button type="button" className="sheet-btn" disabled={busy} onClick={() => doRest('long')}>
          Длинный отдых
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Временные ХП</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={tempHp ?? ''}
              placeholder="кол-во"
              onChange={(e) => setTempHp(e.target.value)}
            />
            <button
              type="button"
              className="sheet-btn"
              disabled={busy || tempHp === null || tempHp === ''}
              onClick={applyTempHp}
            >
              Выдать
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Максимум ХП (ГМ)</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              value={maxHp ?? ''}
              placeholder="новое"
              onChange={(e) => setMaxHp(e.target.value)}
            />
            <button
              type="button"
              className="sheet-btn sheet-btn_primary"
              disabled={busy || maxHp === null || maxHp === ''}
              onClick={applyMaxHp}
            >
              Задать
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

function LevelSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: maxLevelData } = useCharacterMaxLevel(character.id)
  const [newCeiling, setNewCeiling] = useState('')
  const [ceilingBusy, setCeilingBusy] = useState(false)

  const raiseCeiling = async () => {
    const next = Number(newCeiling)
    if (!Number.isFinite(next) || next < (Number(character.level) || 1)) return
    setCeilingBusy(true)
    try {
      await charactersApi.gmPanel.maxLevel.set(character.id, { max_level: next })
      setNewCeiling('')
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(character.id), 'gm-panel', 'max-level'] })
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setCeilingBusy(false)
    }
  }

  return (
    <Section title="Уровень персонажа">
      <div className="flex flex-col gap-2 text-sm text-stone-200">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            Уровень <b>{character.level}</b>
          </span>
          <span>
            Потолок <b>{maxLevelData?.max_level ?? '—'}</b>
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
          <span className="whitespace-nowrap">Новый потолок:</span>
          <Input
            type="number"
            min={Math.max(Number(character.level) || 1, Number(maxLevelData?.max_level) || 1)}
            max="20"
            value={newCeiling}
            onChange={(e) => setNewCeiling(e.target.value)}
            placeholder={`≥ ${maxLevelData?.max_level ?? character.level}`}
          />
          <Button size="sm" variant="ghost" disabled={ceilingBusy || !newCeiling} onClick={raiseCeiling}>
            Задать
          </Button>
        </div>
      </div>
    </Section>
  )
}

function StatsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const characterId = character.id
  const { data: stats } = useCharacterStats(characterId)
  const { data: adjustments = [] } = useCharacterAsiAdjustments(characterId)
  const [newAbility, setNewAbility] = useState('STR')
  const [newAmount, setNewAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const handleAbilityChange = (e) => {
    setNewAbility(e.target.value)
    setNewAmount('')
  }

  // Общий эндпоинт /stats сам считает базу, итог и вклад каждого источника —
  // никакой ручной пересборки на клиенте.
  const currentTotal = stats?.[abilityByCode[newAbility]?.key]?.total ?? 10
  const adjustMin = 1 - currentTotal
  const adjustMax = GM_ABILITY_CAP - currentTotal

  const handleAmountChange = (e) => {
    const raw = e.target.value
    if (raw === '') { setNewAmount(''); return }
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    setNewAmount(String(Math.min(adjustMax, Math.max(adjustMin, n))))
  }

  const parsedAmount = Number(newAmount)
  const amountValid = newAmount !== '' && Number.isFinite(parsedAmount) && parsedAmount >= adjustMin && parsedAmount <= adjustMax

  const invalidateStats = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.stats(Number(characterId)) })
    await queryClient.invalidateQueries({ queryKey: ['characters', Number(characterId), 'gm-panel', 'asi'] })
  }

  const addAdjustment = async () => {
    if (!newAbility || !amountValid) return
    const liveTotal = stats?.[abilityByCode[newAbility]?.key]?.total ?? 10
    const liveMin = 1 - liveTotal
    const liveMax = GM_ABILITY_CAP - liveTotal
    const clamped = Math.min(liveMax, Math.max(liveMin, parsedAmount))
    setBusy(true)
    try {
      await charactersApi.gmPanel.asi.add(characterId, {
        increases: [{ ability: newAbility, amount: clamped }],
      })
      setNewAmount('')
      await invalidateStats()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusy(false)
    }
  }

  const removeAdjustment = async (id) => {
    try {
      await charactersApi.gmPanel.asi.remove(characterId, id)
      await invalidateStats()
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Характеристики">
      <div className="grid gap-5 lg:grid-cols-2">
        <StatsCalculator characterId={characterId} />

        <div className="space-y-5">
          <PlayerChoices characterId={characterId} />

          <div className="border-t border-stone-800 pt-4">
            <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Правки ГМа</p>
        {adjustments.length === 0 ? (
          <p className="text-xs text-stone-600">Правок ГМа нет.</p>
        ) : (
          <ul className="space-y-1">
            {adjustments.map((adj) => (
              <li key={adj.id} className="flex items-center justify-between rounded border border-red-900/40 bg-red-950/20 px-2.5 py-1.5 text-xs text-stone-300">
                <span>
                  {(adj.increases ?? [])
                    .map((inc) => `${abilityLabel(inc.ability)} ${inc.amount > 0 ? `+${inc.amount}` : inc.amount}`)
                    .join(', ') || 'без изменений'}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-red-300 transition hover:text-red-200"
                  onClick={() => removeAdjustment(adj.id)}
                  title="Откатить правку"
                >
                  ✕ Откатить
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Добавление одной правки за раз */}
        <div className="mt-4 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="whitespace-nowrap">Характеристика</span>
              <Select
                value={newAbility}
                onChange={handleAbilityChange}
                className="!w-[150px] !min-w-[150px] !max-w-[150px]"
              >
                {STATS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-stone-400">
              <span className="whitespace-nowrap">Изменение ±</span>
              <Input
                type="number"
                value={newAmount}
                placeholder={`${adjustMin}…${adjustMax}`}
                min={adjustMin}
                max={adjustMax}
                onChange={handleAmountChange}
              />
            </label>
            <Button size="sm" disabled={busy || !newAbility || !amountValid} onClick={addAdjustment}>
              Добавить изменение
            </Button>
          </div>
          </div>
        </div>
        </div>
      </div>
    </Section>
  )
}

// Бэкенд присылает полные ключи ('strength'), приводим к коду STAT'а.
function abilityLabel(ability) {
  const code = ABILITY_CODE_BY_KEY[String(ability).toLowerCase()] ?? String(ability).toUpperCase()
  return STATS.find((s) => s.code === code)?.label ?? code
}

function skillName(skill) {
  const n = typeof skill === 'string' ? skill : (skill?.name ?? '')
  return skillLabels[n] ?? sentenceCase(n)
}

function ExpertiseSection({ character, onError, reload }) {
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const proficiencies = character.skill_proficiencies ?? []
  const [busyId, setBusyId] = useState(null)

  const skillById = useMemo(() => new Map(skillsCatalog.map((s) => [Number(s.id), s])), [skillsCatalog])

  const toggle = async (skillId, next) => {
    setBusyId(skillId)
    try {
      await charactersApi.gmPanel.skills.setExpertise(character.id, skillId, { is_expertise: next })
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyId(null)
    }
  }

  if (proficiencies.length === 0) {
    return (
      <Section title="Навыки и экспертиза">
        <p className="text-sm text-stone-500">У персонажа нет владений навыками.</p>
      </Section>
    )
  }

  return (
    <Section title="Навыки и экспертиза">
      <p className="-mt-1 mb-2 text-xs text-stone-500">
        Нажмите на навык с ★, чтобы снять экспертизу; обычный навык — чтобы дать её. Бонус мастерства удваивается.
      </p>
      <ul className="space-y-1.5">
        {[...proficiencies]
          .sort((a, b) => skillName(skillById.get(Number(a.skill_id))).localeCompare(skillName(skillById.get(Number(b.skill_id))), 'ru'))
          .map((p) => {
          const skill = skillById.get(Number(p.skill_id))
          const expert = Boolean(p.is_expertise)
          return (
            <li key={p.skill_id}>
              <button
                type="button"
                disabled={busyId === p.skill_id}
                onClick={() => toggle(p.skill_id, !expert)}
                title={expert ? 'Снять экспертизу' : 'Дать экспертизу'}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                  expert
                    ? 'border-ember/70 bg-ember/10'
                    : 'border-stone-700/60 bg-stone-900/60 hover:border-stone-600'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    expert ? 'border-ember bg-ember/20 text-ember' : 'border-stone-600 text-transparent'
                  }`}
                >
                  ★
                </span>
                <span className={`min-w-0 flex-1 truncate ${expert ? 'font-medium text-orange-100' : 'text-stone-200'}`}>
                  {skill ? skillName(skill) : `Навык #${p.skill_id}`}
                </span>
                {skill?.ability && <span className="shrink-0 text-[11px] text-stone-500">{abilityLabel(skill.ability)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function GmFeatPickerModal({ grantedIds, level, abilityTotals, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [featId, setFeatId] = useState(null)
  const [increaseId, setIncreaseId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const featsQ = useAllFeats(debouncedQuery)
  const feats = featsQ.data ?? []

  const detailId = featId ?? expandedId
  const detailQ = useFeatDetail(detailId)
  const detail = detailId ? detailQ.data : null

  // Те же правила доступа, что у игрока при выборе черты.
  const featPrereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (abilityTotals[f.prerequisite_ability] || 0) >= f.prerequisite_minimum_score
  }
  const featLevelOk = (f) => f.min_level == null || Number(f.min_level) <= Number(level)

  // Черты, уже выданные персонажу, на повторную выдачу недоступны.
  const available = feats.filter((f) => !grantedIds.has(Number(f.id)))
  const selectedFeat = feats.find((f) => String(f.id) === String(featId))
  // Текущая черта — выбранная или та, что просто открыта на «Посмотреть».
  const viewedFeat = feats.find((f) => String(f.id) === String(expandedId))
  const currentFeat = selectedFeat ?? viewedFeat

  // Варианты увеличения характеристик берём из деталей черты (список может их содержать).
  const increaseOptions = useMemo(() => {
    if (!currentFeat) return []
    const src = detailQ.data ?? currentFeat
    return Array.isArray(src?.ability_score_increases) ? src.ability_score_increases : []
  }, [currentFeat, detailQ.data])

  const needsIncrease = increaseOptions.length > 0

  // Если черта даёт ровно один вариант — используем его автоматически, но id всё равно передаём явно.
  const confirmReady =
    !!currentFeat && (!needsIncrease || increaseId != null || increaseOptions.length === 1)

  const confirm = () => {
    if (!currentFeat || (needsIncrease && increaseId == null && increaseOptions.length !== 1)) return
    const resolvedIncrease = needsIncrease
      ? increaseId ?? (increaseOptions.length === 1 ? increaseOptions[0].id : null)
      : null
    onPick(currentFeat, resolvedIncrease != null ? Number(resolvedIncrease) : null)
  }

  return (
    <Modal
      title="Выдать черту"
      subtitle="Как при выборе игрока: посмотрите черту и подтвердите выбор"
      onClose={onClose}
      size="lg"
      scroll
      footer={
        <div className="w-full space-y-3">
          {currentFeat && needsIncrease && (
            <div className="rounded-lg border border-stone-700/60 bg-stone-800/40 p-3">
              <p className="mb-2 text-sm font-medium text-stone-200">
                Черта даёт увеличение характеристик. Выберите вариант:
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {increaseOptions.map((ai) => {
                  const checked = String(ai.id) === String(increaseId)
                  return (
                    <label
                      key={ai.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        checked
                          ? 'border-ember/60 bg-ember/10 text-stone-100'
                          : 'border-stone-700/60 bg-stone-900/60 text-stone-300 hover:border-ember/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gm-feat-asi"
                        checked={checked}
                        onChange={() => {
                          setIncreaseId(ai.id)
                          setFeatId(currentFeat.id)
                        }}
                        className="checkbox-base"
                      />
                      <span>+{ai.amount} к {abilityName(ai.ability)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="button" disabled={!confirmReady} onClick={confirm}>
              Выдать черту
            </Button>
          </div>
        </div>
      }
    >
      <Input
        type="search"
        placeholder="Поиск черты..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {featsQ.isFetching && feats.length === 0 && (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-stone-700/60 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {!featsQ.isFetching && available.length === 0 && (
        <p className="py-4 text-center text-sm text-stone-400">
          {debouncedQuery ? 'Ничего не найдено по запросу.' : 'Доступных черт нет.'}
        </p>
      )}
      <div className="space-y-2">
        {available.map((f) => {
          const ok = featPrereqOk(f) && featLevelOk(f)
          const selected = String(f.id) === String(featId)
          const expanded = String(expandedId) === String(f.id)
          const rowDetail = expanded ? detail : null
          return (
            <div
              key={f.id}
              className={`rounded-lg border p-3 transition ${
                selected
                  ? 'border-ember/80 bg-ember/10'
                  : ok
                    ? 'border-stone-700/50 bg-stone-800/40'
                    : 'border-stone-800 bg-stone-900/40 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={!ok}
                  onClick={() => {
                    setFeatId(f.id)
                    setIncreaseId(null)
                    setExpandedId(null)
                  }}
                  className={`min-w-0 flex-1 rounded text-left font-medium text-stone-100 ${ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {f.name}
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {(f.ability_score_increases ?? []).length > 0 && (
                    <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-200">
                      улучшение характеристики
                    </span>
                  )}
                  {!featLevelOk(f) && (
                    <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-200">
                      С уровня {f.min_level}
                    </span>
                  )}
                  {!featPrereqOk(f) && (
                    <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-200">
                      Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                    </span>
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
    </Modal>
  )
}

function FeaturePickerModal({ features, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return features
    return features.filter((f) => String(f.name ?? '').toLowerCase().includes(q))
  }, [features, query])

  return (
    <Modal title="Выдать особенность" subtitle="Особые свойства из справочника" onClose={onClose} size="md" scroll>
      <Input
        type="search"
        placeholder="Поиск особенности..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {filtered.length === 0 && <p className="text-sm text-stone-500">Особенностей не найдено.</p>}
        {filtered.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f)}
            className="w-full rounded-lg border border-stone-700/60 bg-stone-900/60 p-3 text-left transition hover:border-ember/50"
          >
            <p className="text-sm font-medium text-stone-100">{f.name}</p>
            {f.level != null && (
              <span className="mr-2 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-400">ур. {f.level}</span>
            )}
            {f.description && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{f.description}</p>}
          </button>
        ))}
      </div>
    </Modal>
  )
}

function FeatureNotesModal({ name, notes, onSave, onClose }) {
  const [value, setValue] = useState(notes ?? '')

  return (
    <Modal
      title="Заметка по особенности"
      subtitle={name}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={() => onSave(value)}>
            Сохранить
          </Button>
        </>
      }
    >
      <Field label="Заметка для игрока">
        <TextArea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Что это и зачем дана..."
          autoFocus
        />
      </Field>
    </Modal>
  )
}

function FeatsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: charFeats = [] } = useCharacterFeats(character.id)
  const { data: stats } = useCharacterStats(character.id)
  const [featPickerOpen, setFeatPickerOpen] = useState(false)
  const [openFeatId, setOpenFeatId] = useState(null)

  const grantedIncreaseOf = (cf) => {
    const explicit = cf.ability_score_increase
    if (explicit?.ability != null) return explicit
    const options = cf.feat?.ability_score_increases ?? []
    const id = cf.ability_score_increase_id
    if (id != null) return options.find((a) => String(a.id) === String(id)) ?? null
    return options.length === 1 ? options[0] : null
  }

  // Итоги характеристик персонажа — чтобы проверять требования черт как у игрока.
  const abilityTotals = useMemo(
    () => Object.fromEntries(STATS.map((s) => [s.code, stats?.[s.key]?.total ?? 10])),
    [stats],
  )
  const grantedIds = useMemo(
    () => new Set(charFeats.map((cf) => Number(cf.feat_id) || Number(cf.feat?.id)).filter(Boolean)),
    [charFeats],
  )

  const grantFeat = async (feat, increaseId) => {
    setFeatPickerOpen(false)
    try {
      await charactersApi.gmPanel.feats.add(character.id, {
        feat_id: Number(feat.id),
        ability_score_increase_id: increaseId ? Number(increaseId) : null,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.feats(Number(character.id)) })
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeat = async (charFeatId) => {
    try {
      await charactersApi.gmPanel.feats.remove(character.id, charFeatId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.feats(Number(character.id)) })
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Черты">
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-400">Черт: {charFeats.length}</p>
        <button
          type="button"
          onClick={() => setFeatPickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          Добавить...
        </button>
      </div>

      {charFeats.length === 0 ? (
        <p className="text-sm text-stone-500">Черт нет.</p>
      ) : (
        <ul className="space-y-2">
          {charFeats.map((cf) => {
            const open = openFeatId === cf.id
            const inc = grantedIncreaseOf(cf)
            return (
              <li key={cf.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60">
                <div className="flex items-center justify-between gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenFeatId(open ? null : cf.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
                    <span className="truncate text-sm font-medium text-stone-100">
                      {cf.feat?.name || `Черта #${cf.feat_id}`}
                    </span>
                    {inc && (
                      <span className="shrink-0 rounded border border-emerald-700/60 bg-emerald-900/30 px-1.5 py-0.5 text-[11px] text-emerald-200">
                        +{inc.amount} к {abilityName(inc.ability)}
                      </span>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="danger"
                    size="xs"
                    className="shrink-0"
                    onClick={() => removeFeat(cf.id)}
                  >
                    Убрать
                  </Button>
                </div>
                {open && cf.feat?.description && (
                  <div className="whitespace-pre-wrap border-t border-stone-800 px-4 py-3 text-xs text-stone-400">
                    {cf.feat.description}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {featPickerOpen && (
        <GmFeatPickerModal
          grantedIds={grantedIds}
          level={character.level}
          abilityTotals={abilityTotals}
          onPick={grantFeat}
          onClose={() => setFeatPickerOpen(false)}
        />
      )}
    </Section>
  )
}

function FeaturesSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: charFeatures = [] } = useCharacterFeatures(character.id)
  const { data: catalogFeatures = [] } = useFeatures({ size: 100, source_type: 'OTHER' })
  const [featurePickerOpen, setFeaturePickerOpen] = useState(false)
  const [notesTarget, setNotesTarget] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [openFeatureId, setOpenFeatureId] = useState(null)

  // Показываем только выданные особенности типа OTHER: классовые/расовые и т.п.
  // приходят автоматически, ГМ их вручную не редактирует.
  const otherFeatures = useMemo(
    () => charFeatures.filter((cf) => (cf.feature?.source_type ?? 'OTHER') === 'OTHER'),
    [charFeatures],
  )

  const invalidateFeatures = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.features(Number(character.id)) })
    await reload()
  }

  const grantFeature = async (feature) => {
    setFeaturePickerOpen(false)
    try {
      await charactersApi.gmPanel.features.add(character.id, { feature_id: Number(feature.id) })
      await invalidateFeatures()
    } catch (e) {
      onError(e)
    }
  }

  const saveFeatureNotes = async (notes) => {
    const target = notesTarget
    setNotesTarget(null)
    try {
      await charactersApi.gmPanel.features.update(character.id, target.id, { notes })
      await invalidateFeatures()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeature = async (charFeatureId) => {
    setRemoveTarget(null)
    try {
      await charactersApi.gmPanel.features.remove(character.id, charFeatureId)
      await invalidateFeatures()
    } catch (e) {
      onError(e)
    }
  }

  const featureName = (cf) => cf.feature?.name || `Особенность #${cf.feature_id}`

  return (
    <Section title="Особенности">
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-400">Особенностей: {otherFeatures.length}</p>
        <button
          type="button"
          onClick={() => setFeaturePickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          Добавить...
        </button>
      </div>

      {otherFeatures.length === 0 ? (
        <p className="text-sm text-stone-500">Особенностей нет.</p>
      ) : (
        <ul className="space-y-2">
          {otherFeatures.map((cf) => {
            const open = openFeatureId === cf.id
            return (
              <li key={cf.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60">
                <div className="flex items-center justify-between gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => setOpenFeatureId(open ? null : cf.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
                    <span className="truncate text-sm font-medium text-stone-100">{featureName(cf)}</span>
                    <span className="shrink-0 rounded border border-gold/40 px-1.5 py-0.5 text-[10px] text-gold-light">
                      Особая
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" size="xs" onClick={() => setNotesTarget(cf)}>
                      Заметка
                    </Button>
                    <Button type="button" variant="danger" size="xs" onClick={() => setRemoveTarget(cf)}>
                      Убрать
                    </Button>
                  </div>
                </div>
                {open && (cf.feature?.description || cf.notes) && (
                  <div className="border-t border-stone-800 px-4 py-3 text-xs text-stone-400">
                    {cf.feature?.description ? (
                      <p className="whitespace-pre-wrap">{cf.feature.description}</p>
                    ) : null}
                    {cf.notes && <p className="mt-1.5 text-stone-500">Заметка: {cf.notes}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {featurePickerOpen && (
        <FeaturePickerModal features={catalogFeatures} onPick={grantFeature} onClose={() => setFeaturePickerOpen(false)} />
      )}
      {notesTarget && (
        <FeatureNotesModal
          name={featureName(notesTarget)}
          notes={notesTarget.notes}
          onSave={saveFeatureNotes}
          onClose={() => setNotesTarget(null)}
        />
      )}
      {removeTarget && (
        <ConfirmDialog
          title="Убрать особенность?"
          message={
            <>
              Вы точно хотите убрать{' '}
              <span className="font-semibold text-stone-100">{featureName(removeTarget)}</span> у персонажа? Это
              действие необратимо.
            </>
          }
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => removeFeature(removeTarget.id)}
        />
      )}
    </Section>
  )
}

function ItemEditModal({ title, subtitle, value, catalogItem, onSave, onClose }) {
  const [edit, setEdit] = useState(() => ({
    quantity: value?.quantity ?? 1,
    is_equipped: Boolean(value?.is_equipped),
    is_attuned: Boolean(value?.is_attuned),
    notes: value?.notes ?? '',
  }))

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={() => onSave(edit)}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Количество">
          <Input
            type="number"
            min={0}
            value={edit.quantity}
            onChange={(e) => setEdit({ ...edit, quantity: Math.max(0, Number(e.target.value) || 0) })}
            autoFocus
          />
        </Field>
        <div className="flex flex-col justify-center gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-200">
            <input
              type="checkbox"
              checked={edit.is_equipped}
              onChange={(e) => setEdit({ ...edit, is_equipped: e.target.checked })}
              className="size-4 accent-ember"
            />
            Экипировано
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-200">
            <input
              type="checkbox"
              checked={edit.is_attuned}
              onChange={(e) => setEdit({ ...edit, is_attuned: e.target.checked })}
              className="size-4 accent-ember"
            />
            Настроено
          </label>
        </div>
      </div>
      <Field label="Заметка">
        <TextArea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Необязательно" />
      </Field>
      {catalogItem?.description && (
        <p className="line-clamp-3 text-xs text-stone-500">{catalogItem.description}</p>
      )}
    </Modal>
  )
}

function ItemGrantModal({ catalogItem, onConfirm, onClose }) {
  const [qty, setQty] = useState('1')

  return (
    <Modal title="Выдать предмет" subtitle={catalogItem?.name} onClose={onClose} size="sm">
      <Field label="Количество">
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onConfirm(Math.max(1, Number(qty) || 1))}
          autoFocus
        />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={() => onConfirm(Math.max(1, Number(qty) || 1))}>
          Выдать
        </Button>
      </div>
    </Modal>
  )
}

const PICKER_PAGE_SIZE = 50

function ItemsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [infoItemId, setInfoItemId] = useState(null)
  const [addTarget, setAddTarget] = useState(null)

  // Встроенная панель выдачи предметов: серверный поиск, фильтры и пагинация — как в справочнике.
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const listParams = useMemo(() => {
    const params = { page, size: PICKER_PAGE_SIZE }
    if (appliedSearch.trim()) params.search = appliedSearch.trim()
    if (Array.isArray(filters.item_type) && filters.item_type.length > 0) params.item_type = filters.item_type
    if (Array.isArray(filters.rarity) && filters.rarity.length > 0) params.rarity = filters.rarity
    return params
  }, [page, appliedSearch, filters])

  const listQ = useCatalogPage('items', listParams)
  const pageItems = listQ.data?.items ?? []
  const total = listQ.data?.total ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })

  const applySearch = () => {
    setAppliedSearch(queryInput)
    setPage(1)
  }

  const applyFilters = (next) => {
    setFilters(next)
    setPage(1)
  }

  // Каждый POST создаёт новый стек — даже если такой предмет уже есть у персонажа.
  const addItem = async (catalogItem, qty) => {
    try {
      await charactersApi.gmPanel.items.add(character.id, {
        item_id: Number(catalogItem.id),
        quantity: qty,
      })
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const saveEdit = async (ci, form) => {
    setEditTarget(null)
    try {
      await charactersApi.gmPanel.items.update(character.id, ci.id, {
        quantity: form.quantity,
        is_equipped: form.is_equipped,
        is_attuned: form.is_attuned,
        notes: form.notes,
      })
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const removeItem = async (charItemId) => {
    try {
      await charactersApi.gmPanel.items.remove(character.id, charItemId)
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Снаряжение персонажа">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Левая колонка: выдача предметов */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">Выдать предмет</p>
          <div className="mb-2 flex gap-2">
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Поиск: имя, описание..."
            />
            <button
              type="button"
              onClick={applySearch}
              className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              title="Искать на сервере"
            >
              ⌕
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={`shrink-0 rounded border px-3 py-2.5 text-sm font-medium transition ${
                Object.keys(filters).length > 0
                  ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
                  : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
              }`}
            >
              Фильтр
            </button>
          </div>

          {listQ.error && <ErrorBox error={listQ.error} onRetry={() => listQ.refetch()} />}
          {!listQ.data && !listQ.error && (
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="space-y-1.5 rounded-lg border border-stone-700/60 p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              ))}
            </div>
          )}

          <div id="gm-item-picker-list" className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {pageItems.length === 0 ? (
              <p className="text-sm text-stone-500">Предметов не найдено.</p>
            ) : (
              pageItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setAddTarget(it)}
                  disabled={!listQ.data}
                  className="w-full rounded-lg border border-stone-700/60 bg-stone-900/60 p-3 text-left transition hover:border-ember/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-stone-100">{it.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {[it.item_type ? label(it.item_type) : null, it.rarity && it.rarity !== 'NONE' ? label(it.rarity) : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </button>
              ))
            )}
          </div>
          <Pagination
            page={page}
            total={total}
            size={PICKER_PAGE_SIZE}
            onPage={(p) => {
              setPage(p)
              document.getElementById('gm-item-picker-list')?.scrollIntoView({ block: 'start' })
            }}
          />
        </section>

        {/* Правая колонка: инвентарь персонажа */}
        <section>
          <div className="-mt-1 mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
              Инвентарь ({items.length})
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-stone-500">Снаряжения пока нет.</p>
          ) : (
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {items.map((ci) => {
                return (
                  <li key={ci.id} className="flex items-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => setInfoItemId(ci.item_id)}
                      className="link-ember min-w-0 flex-1 truncate text-left font-display text-sm font-bold"
                      title="Показать предмет"
                    >
                      {ci.item?.name ?? `Предмет #${ci.item_id}`}
                      <span className="ml-2 font-sans text-xs font-normal tabular-nums text-stone-400">× {ci.quantity}</span>
                    </button>
                    {(ci.is_equipped || ci.is_attuned) && (
                      <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        {ci.is_equipped && <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Экип.</span>}
                        {ci.is_attuned && <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Настр.</span>}
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" size="xs" onClick={() => setEditTarget(ci)}>
                        Изменить
                      </Button>
                      <Button type="button" variant="danger" size="xs" onClick={() => setConfirmTarget(ci)}>
                        Убрать
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {showFilters && (
        <FilterModal
          filters={ITEM_FILTERS}
          value={filters}
          onChange={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {editTarget && (
        <ItemEditModal
          title={`Изменить: ${editTarget.item?.name ?? `Предмет #${editTarget.item_id}`}`}
          value={editTarget}
          catalogItem={editTarget.item}
          onSave={(form) => saveEdit(editTarget, form)}
          onClose={() => setEditTarget(null)}
        />
      )}

      {infoItemId != null && (
        <ItemInfoModal itemId={infoItemId} onClose={() => setInfoItemId(null)} />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Убрать предмет?"
          message={
            <>
              Вы точно хотите убрать{' '}
              <span className="font-semibold text-stone-100">
                «{confirmTarget.item?.name ?? `Предмет #${confirmTarget.item_id}`}»
              </span>{' '}
              у персонажа? Это действие необратимо.
            </>
          }
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            setConfirmTarget(null)
            removeItem(confirmTarget.id)
          }}
        />
      )}

      {addTarget && (
        <ItemGrantModal
          catalogItem={addTarget}
          onClose={() => setAddTarget(null)}
          onConfirm={(qty) => {
            const target = addTarget
            setAddTarget(null)
            addItem(target, qty)
          }}
        />
      )}
    </Section>
  )
}

export default function GmCharacterPanel({ character, onError, reload }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <LevelSection character={character} onError={onError} reload={reload} />
        <HpSection character={character} onError={onError} reload={reload} />
      </div>
      <div className="min-w-0">
        <ExpertiseSection character={character} onError={onError} reload={reload} />
      </div>
      <div className="lg:col-span-2">
        <FeatsSection character={character} onError={onError} reload={reload} />
      </div>
      <div className="lg:col-span-2">
        <FeaturesSection character={character} onError={onError} reload={reload} />
      </div>
      <div className="lg:col-span-2">
        <StatsSection character={character} onError={onError} reload={reload} />
      </div>
      <div className="lg:col-span-2">
        <ItemsSection character={character} onError={onError} reload={reload} />
      </div>
    </div>
  )
}
