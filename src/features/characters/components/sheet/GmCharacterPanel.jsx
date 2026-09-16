import { useMemo, useRef, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { catalogApi } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import {
  useCharacterAsiAdjustments,
  useCharacterFeats,
  useCharacterFeatures,
  useCharacterGrantedSpells,
  useCharacterItems,
  useCharacterMaxLevel,
  useCharacterProficiencies,
  useCharacterStats,
} from '@/features/characters/queries.js'
import { useFeatDetail, useSkills } from '@/features/catalog/queries.js'
import { TrashIcon } from '@/features/catalog/components/editor/editorShared.jsx'
import { PickerMenu } from '@/features/catalog/components/editor/effectTypeEditors.jsx'
import SpellPickerModal from '@/features/catalog/components/editor/SpellPickerModal.jsx'
import ItemPickerModal from '@/features/catalog/components/editor/ItemPickerModal.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { STATS, abilityByCode, abilityName } from '@/lib/utils/ability.js'
import { Badge, Button, ConfirmDialog, Field, Input, Modal, RichText, Select, Skeleton } from '@/components/ui'
import { armorProficiencyLabels, label, sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function Section({ title, action, children }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
      {action ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="sheet-section-label !mt-0">{title}</p>
          {action}
        </div>
      ) : (
        <p className="sheet-section-label !mt-0">{title}</p>
      )}
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
  const queryClient = useQueryClient()
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const { data: proficienciesData } = useCharacterProficiencies(character.id)
  const proficiencies = proficienciesData?.skills ?? []
  const [busyId, setBusyId] = useState(null)

  const skillById = useMemo(() => new Map(skillsCatalog.map((s) => [Number(s.id), s])), [skillsCatalog])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.proficiencies(Number(character.id)) })

  const toggle = async (skillId, next) => {
    setBusyId(skillId)
    try {
      await charactersApi.gmPanel.proficiencies.setSkillExpertise(character.id, skillId, { is_expertise: next })
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyId(null)
    }
  }

  const addSkill = async (skillId) => {
    setBusyId(skillId)
    try {
      await charactersApi.gmPanel.proficiencies.addSkill(character.id, skillId)
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyId(null)
    }
  }

  const removeSkill = async (skillId) => {
    setBusyId(skillId)
    try {
      await charactersApi.gmPanel.proficiencies.removeSkill(character.id, skillId)
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyId(null)
    }
  }

  const usedSkillIds = new Set(proficiencies.map((p) => Number(p.skill_id)))
  const addOptions = skillsCatalog
    .filter((s) => !usedSkillIds.has(Number(s.id)))
    .map((s) => ({ key: s.id, label: skillName(s) }))

  return (
    <Section title="Навыки и экспертиза">
      <div className="-mt-1 mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          Нажмите на навык с ★, чтобы снять экспертизу; обычный навык — чтобы дать её.
        </p>
        <PickerMenu
          options={addOptions}
          onPick={addSkill}
          disabled={addOptions.length === 0}
          addLabel={<PlusIcon />}
          searchable
        />
      </div>
      {proficiencies.length === 0 ? (
        <p className="text-sm text-stone-500">У персонажа нет владений навыками.</p>
      ) : (
        <ul className="space-y-1.5">
          {[...proficiencies]
            .sort((a, b) => skillName(skillById.get(Number(a.skill_id))).localeCompare(skillName(skillById.get(Number(b.skill_id))), 'ru'))
            .map((p) => {
              const skill = skillById.get(Number(p.skill_id))
              const expert = Boolean(p.is_expertise)
              const removable = (p.sources ?? []).some((s) => s.source_type === 'GM')
              return (
                <li key={p.skill_id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyId === p.skill_id}
                    onClick={() => toggle(p.skill_id, !expert)}
                    title={expert ? 'Снять экспертизу' : 'Дать экспертизу'}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
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
                  {removable && (
                    <button
                      type="button"
                      onClick={() => removeSkill(p.skill_id)}
                      disabled={busyId === p.skill_id}
                      className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50 disabled:opacity-50"
                      title="Убрать владение"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </Section>
  )
}

// Владения доспехами/оружием — тот же принцип, что и навыки: список текущих
// владений с «Убрать» (только для GM-строки, остальные приходят от
// класса/расы/особенностей и не редактируются здесь) и подменю добавления.
function ArmorProficienciesSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: proficienciesData } = useCharacterProficiencies(character.id)
  const armor = proficienciesData?.armor ?? []
  const [busyType, setBusyType] = useState(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.proficiencies(Number(character.id)) })

  const used = new Set(armor.map((a) => a.armor_type))
  const addOptions = Object.entries(armorProficiencyLabels).map(([key, label]) => ({
    key,
    label,
    disabled: used.has(key),
  }))

  const add = async (armorType) => {
    setBusyType(armorType)
    try {
      await charactersApi.gmPanel.proficiencies.addArmor(character.id, armorType)
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyType(null)
    }
  }

  const remove = async (armorType) => {
    setBusyType(armorType)
    try {
      await charactersApi.gmPanel.proficiencies.removeArmor(character.id, armorType)
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyType(null)
    }
  }

  return (
    <Section
      title="Владение доспехами"
      action={
        <PickerMenu
          options={addOptions}
          onPick={add}
          disabled={addOptions.every((o) => o.disabled)}
          addLabel={<PlusIcon />}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {armor.length === 0 && <p className="text-sm text-stone-500">Владений нет.</p>}
        {armor.map((a) => {
          const removable = (a.sources ?? []).some((s) => s.source_type === 'GM')
          return (
            <span
              key={a.armor_type}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm ${
                removable ? 'border-ember/70 bg-ember/10 text-orange-100' : 'border-stone-700/60 bg-stone-900/60 text-stone-200'
              }`}
            >
              {armorProficiencyLabels[a.armor_type] ?? a.armor_type}
              {removable && (
                <button
                  type="button"
                  onClick={() => remove(a.armor_type)}
                  disabled={busyType === a.armor_type}
                  className="text-stone-500 transition hover:text-red-300 disabled:opacity-50"
                  title="Убрать владение"
                >
                  ✕
                </button>
              )}
            </span>
          )
        })}
      </div>
    </Section>
  )
}

function WeaponProficienciesSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: proficienciesData } = useCharacterProficiencies(character.id)
  const weapons = (proficienciesData?.weapons ?? []).filter((w) => w.weapon_category != null)
  const [busyType, setBusyType] = useState(null)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.proficiencies(Number(character.id)) })

  const used = new Set(weapons.map((w) => w.weapon_category))
  const addOptions = Object.entries(weaponProficiencyLabels).map(([key, label]) => ({
    key,
    label,
    disabled: used.has(key),
  }))

  const add = async (weaponCategory) => {
    setBusyType(weaponCategory)
    try {
      await charactersApi.gmPanel.proficiencies.addWeapon(character.id, { weapon_category: weaponCategory })
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyType(null)
    }
  }

  const remove = async (weaponCategory) => {
    setBusyType(weaponCategory)
    try {
      await charactersApi.gmPanel.proficiencies.removeWeapon(character.id, { weapon_category: weaponCategory })
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusyType(null)
    }
  }

  return (
    <Section
      title="Владение оружием"
      action={
        <PickerMenu
          options={addOptions}
          onPick={add}
          disabled={addOptions.every((o) => o.disabled)}
          addLabel={<PlusIcon />}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {weapons.length === 0 && <p className="text-sm text-stone-500">Владений нет.</p>}
        {weapons.map((w) => {
          const removable = (w.sources ?? []).some((s) => s.source_type === 'GM')
          return (
            <span
              key={w.weapon_category}
              className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm ${
                removable ? 'border-ember/70 bg-ember/10 text-orange-100' : 'border-stone-700/60 bg-stone-900/60 text-stone-200'
              }`}
            >
              {weaponProficiencyLabels[w.weapon_category] ?? w.weapon_category}
              {removable && (
                <button
                  type="button"
                  onClick={() => remove(w.weapon_category)}
                  disabled={busyType === w.weapon_category}
                  className="text-stone-500 transition hover:text-red-300 disabled:opacity-50"
                  title="Убрать владение"
                >
                  ✕
                </button>
              )}
            </span>
          )
        })}
      </div>
    </Section>
  )
}

const PICKER_PAGE_SIZE = 30
const PICKER_SCROLL_THRESHOLD = 120

function GmFeatPickerModal({ grantedIds, level, abilityTotals, onPick, onClose }) {
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [allFeats, setAllFeats] = useState([])
  const [featId, setFeatId] = useState(null)
  const [increaseId, setIncreaseId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const listRef = useRef(null)

  const listParams = { page, size: PICKER_PAGE_SIZE }
  if (appliedSearch.trim()) listParams.search = appliedSearch.trim()

  const featsQ = useQuery({
    queryKey: ['catalog', 'feat-picker-modal', appliedSearch.trim(), filters, page],
    queryFn: () => catalogApi.feats.list(listParams),
  })

  // Смена поиска/фильтров начинает список заново, а не докидывает страницы
  // к прежней выборке.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    setAllFeats([])
  }, [appliedSearch, filters])

  useEffect(() => {
    if (!featsQ.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllFeats((prev) => (page === 1 ? featsQ.data.items : [...prev, ...featsQ.data.items]))
  }, [featsQ.data, page])

  const total = featsQ.data?.total ?? 0
  const hasMore = allFeats.length < total
  const feats = allFeats
  const hasActiveFilters = Object.keys(filters).length > 0

  const applySearch = () => setAppliedSearch(queryInput)
  const onScroll = () => {
    const el = listRef.current
    if (!el || featsQ.isFetching || !hasMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < PICKER_SCROLL_THRESHOLD) {
      setPage((p) => p + 1)
    }
  }

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
          <div className="modal-actions">
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
      <div className="mb-3 flex gap-2">
        <Input
          autoFocus
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Поиск черты…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={applySearch}
          title="Искать"
          className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 text-sm text-stone-200 transition hover:bg-stone-800"
        >
          ⌕
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`shrink-0 rounded border px-3 text-sm transition ${
            hasActiveFilters
              ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
              : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
          }`}
        >
          Фильтр
        </button>
      </div>
      {!featsQ.isFetching && available.length === 0 && (
        <p className="py-4 text-center text-sm text-stone-400">
          {appliedSearch ? 'Ничего не найдено по запросу.' : 'Доступных черт нет.'}
        </p>
      )}
      <div ref={listRef} onScroll={onScroll} className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
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
                  className={`min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-stone-100 ${ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  {sentenceCase(f.name)}
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {effectBadges(f).map((badge, i) => (
                    <Badge key={i} tone={badge.tone} className="shrink-0">
                      {badge.text}
                    </Badge>
                  ))}
                  {!featLevelOk(f) && (
                    <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-200">
                      С ур. {f.min_level}
                    </span>
                  )}
                  {!featPrereqOk(f) && (
                    <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-200">
                      Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Посмотреть: ${f.name}`}
                    onClick={() => setExpandedId(expanded ? null : f.id)}
                    className="rounded border border-stone-700 px-2 py-1 text-[11px] text-stone-300 transition hover:border-ember/50 hover:bg-stone-800"
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
                      {rowDetail?.description || rowDetail?.effects_summary ? (
                        <RichText
                          value={rowDetail?.description}
                          tail={rowDetail?.effects_summary}
                          className="text-xs text-stone-300"
                        />
                      ) : (
                        <p className="text-xs italic text-stone-500">Описание отсутствует.</p>
                      )}
                      {rowDetail?.prerequisite_description && (
                        <RichText value={rowDetail.prerequisite_description} className="mt-1 text-xs text-stone-400" />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {featsQ.isFetching && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <FilterModal
          filters={catalog.feats.filters}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Modal>
  )
}

function FeatureDetail({ featureId }) {
  const detailQ = useQuery({
    // FeatureResponse уже содержит ability_effects и effects_summary —
    // отдельный запрос за эффектами не нужен.
    queryKey: ['catalog', 'features', 'detail', featureId],
    queryFn: () => catalogApi.features.get(featureId),
    enabled: featureId != null,
  })
  const f = detailQ.data
  if (detailQ.isFetching || !f) {
    return (
      <div className="space-y-1.5 py-1" aria-busy="true">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    )
  }
  // Тот же приём, что и в каталоге (FeatureDetailCard): effects_summary с
  // бэка дорендеривается в конце описания одним блоком, под тем же
  // заголовком, который уже виден в бейдже строки («Даёт эффекты»).
  return f.description || f.effects_summary ? (
    <RichText value={f.description} tail={f.effects_summary} className="text-xs text-stone-300" />
  ) : (
    <p className="text-xs italic text-stone-500">Описание отсутствует.</p>
  )
}

function FeaturePickerModal({ grantedIds, onPick, onClose }) {
  const [queryInput, setQueryInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [allFeatures, setAllFeatures] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const listRef = useRef(null)

  const listParams = { page, size: PICKER_PAGE_SIZE, source_type: 'OTHER' }
  if (appliedSearch.trim()) listParams.search = appliedSearch.trim()

  const featuresQ = useQuery({
    queryKey: ['catalog', 'feature-picker-modal', appliedSearch.trim(), filters, page],
    queryFn: () => catalogApi.features.list(listParams),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    setAllFeatures([])
  }, [appliedSearch, filters])

  useEffect(() => {
    if (!featuresQ.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllFeatures((prev) => (page === 1 ? featuresQ.data.items : [...prev, ...featuresQ.data.items]))
  }, [featuresQ.data, page])

  const total = featuresQ.data?.total ?? 0
  const hasMore = allFeatures.length < total
  const available = allFeatures.filter((f) => !grantedIds.has(Number(f.id)))
  const hasActiveFilters = Object.keys(filters).length > 0

  const applySearch = () => setAppliedSearch(queryInput)
  const onScroll = () => {
    const el = listRef.current
    if (!el || featuresQ.isFetching || !hasMore) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < PICKER_SCROLL_THRESHOLD) {
      setPage((p) => p + 1)
    }
  }

  return (
    <Modal title="Выдать особенность" subtitle="Особые свойства из справочника" onClose={onClose} size="lg" scroll>
      <div className="mb-3 flex gap-2">
        <Input
          autoFocus
          type="search"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Поиск особенности…"
          className="flex-1"
        />
        <button
          type="button"
          onClick={applySearch}
          title="Искать"
          className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-3 text-sm text-stone-200 transition hover:bg-stone-800"
        >
          ⌕
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`shrink-0 rounded border px-3 text-sm transition ${
            hasActiveFilters
              ? 'border-ember/80 bg-ember/10 text-ember hover:bg-ember/20'
              : 'border-stone-700 bg-stone-800/70 text-stone-200 hover:bg-stone-800'
          }`}
        >
          Фильтр
        </button>
      </div>
      <div ref={listRef} onScroll={onScroll} className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
        {!featuresQ.isFetching && available.length === 0 && (
          <p className="text-sm text-stone-500">Особенностей не найдено.</p>
        )}
        {available.map((f) => {
          const expanded = expandedId === f.id
          return (
            <div
              key={f.id}
              className={`rounded-lg border border-stone-700/60 bg-stone-900/60 transition ${expanded ? 'bg-stone-900' : ''}`}
            >
              <div className="flex items-start gap-2 p-3">
                <button
                  type="button"
                  onClick={() => onPick(f)}
                  className="min-w-0 flex-1 truncate rounded text-left text-sm font-medium text-stone-100 hover:text-ember"
                >
                  {sentenceCase(f.name)}
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {effectBadges(f).map((badge, i) => (
                    <Badge key={i} tone={badge.tone} className="shrink-0">
                      {badge.text}
                    </Badge>
                  ))}
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
                <div className="border-t border-stone-700/50 px-3 py-2.5">
                  <FeatureDetail featureId={f.id} />
                </div>
              )}
            </div>
          )
        })}
        {featuresQ.isFetching && (
          <div className="space-y-1.5 py-1" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <FilterModal
          filters={catalog.features.filters}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </Modal>
  )
}

function FeatsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: charFeats = [] } = useCharacterFeats(character.id)
  const { data: stats } = useCharacterStats(character.id)
  const [featPickerOpen, setFeatPickerOpen] = useState(false)
  const [openFeatId, setOpenFeatId] = useState(null)

  // Эффекты выданной черты приходят так же, как у особенности: плоские
  // списки — в cf.effects, уже отвеченные выборы — в cf.choices.
  const hasGrantedEffects = (cf) => {
    const flatHasAny = Object.values(cf.effects ?? {}).some((v) => Array.isArray(v) && v.length > 0)
    const choicesHaveAny = (cf.choices ?? []).some((choice) =>
      Object.entries(choice).some(
        ([key, value]) => !key.startsWith('choice_') && Array.isArray(value) && value.length > 0,
      ),
    )
    return flatHasAny || choicesHaveAny
  }
  const hasGrantedChoices = (cf) => (cf.choices ?? []).length > 0

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
                      {cf.feat?.name ? sentenceCase(cf.feat.name) : `Черта #${cf.feat_id}`}
                    </span>
                    {hasGrantedEffects(cf) && (
                      <Badge tone="good" className="shrink-0">
                        Даёт эффекты
                      </Badge>
                    )}
                    {hasGrantedChoices(cf) && (
                      <Badge tone="violet" className="shrink-0">
                        Выбор
                      </Badge>
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
                {open && (cf.feat?.description || cf.feat?.effects_summary) && (
                  <RichText
                    value={cf.feat?.description}
                    tail={cf.feat?.effects_summary}
                    className="border-t border-stone-800 px-4 py-3 text-xs text-stone-400"
                  />
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
  const [featurePickerOpen, setFeaturePickerOpen] = useState(false)
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

  const removeFeature = async (charFeatureId) => {
    setRemoveTarget(null)
    try {
      await charactersApi.gmPanel.features.remove(character.id, charFeatureId)
      await invalidateFeatures()
    } catch (e) {
      onError(e)
    }
  }

  const featureName = (cf) => (cf.feature?.name ? sentenceCase(cf.feature.name) : `Особенность #${cf.feature_id}`)

  // Эффекты выданной особенности приходят не в том же виде, что у каталожной
  // FeatureResponse: плоские списки лежат в cf.effects (без единого именования
  // ключей), плюс уже отвеченные выборы — в cf.choices.Бейдж «Даёт эффекты»
  // просто проверяет, есть ли там хоть что-то непустое.
  const hasGrantedEffects = (cf) => {
    const flatHasAny = Object.values(cf.effects ?? {}).some((v) => Array.isArray(v) && v.length > 0)
    const choicesHaveAny = (cf.choices ?? []).some((choice) =>
      Object.entries(choice).some(
        ([key, value]) => !key.startsWith('choice_') && Array.isArray(value) && value.length > 0,
      ),
    )
    return flatHasAny || choicesHaveAny
  }
  const hasGrantedChoices = (cf) => (cf.choices ?? []).length > 0

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
                    {hasGrantedEffects(cf) && (
                      <Badge tone="good" className="shrink-0">
                        Даёт эффекты
                      </Badge>
                    )}
                    {hasGrantedChoices(cf) && (
                      <Badge tone="violet" className="shrink-0">
                        Выбор
                      </Badge>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" variant="danger" size="xs" onClick={() => setRemoveTarget(cf)}>
                      Убрать
                    </Button>
                  </div>
                </div>
                {open && (cf.feature?.description || cf.feature?.effects_summary || cf.notes) && (
                  <div className="border-t border-stone-800 px-4 py-3 text-xs text-stone-400">
                    {cf.feature?.description || cf.feature?.effects_summary ? (
                      <RichText value={cf.feature?.description} tail={cf.feature?.effects_summary} />
                    ) : null}
                    {cf.notes && (
                      <div className="mt-1.5 text-stone-500">
                        Заметка: <RichText value={cf.notes} className="inline" />
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {featurePickerOpen && (
        <FeaturePickerModal
          grantedIds={new Set(charFeatures.map((cf) => Number(cf.feature_id)))}
          onPick={grantFeature}
          onClose={() => setFeaturePickerOpen(false)}
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

// Дополнительные заклинания, выданные ГМ: выдаются/удаляются вне ячеек
// (homebrew-бонус) через modalreuse SpellPickerModal из каталога.
function GrantedSpellsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: grantedSpells = [] } = useCharacterGrantedSpells(character.id)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(character.id)) })
    await reload()
  }

  const grantSpell = async (sp) => {
    setPickerOpen(false)
    try {
      await charactersApi.gmPanel.spells.add(character.id, { spell_id: Number(sp.id) })
      await invalidate()
    } catch (e) {
      onError(e)
    }
  }

  const removeSpell = async (cs) => {
    setRemoveTarget(null)
    try {
      await charactersApi.gmPanel.spells.remove(character.id, cs.id)
      await invalidate()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Дополнительные заклинания">
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-400">Выдано ГМ: {grantedSpells.length}</p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          Добавить...
        </button>
      </div>

      {grantedSpells.length === 0 ? (
        <p className="text-sm text-stone-500">Дополнительных заклинаний нет.</p>
      ) : (
        <ul className="space-y-2">
          {grantedSpells.map((cs) => {
            const sp = cs.spell || {}
            return (
              <li key={cs.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-stone-100">
                    {sp.name ? sentenceCase(sp.name) : `Заклинание #${cs.spell_id}`}
                  </p>
                  {sp.school && (
                    <span className="text-xs text-stone-500">{label(sp.school)}</span>
                  )}
                </div>
                <Button type="button" variant="danger" size="xs" onClick={() => setRemoveTarget(cs)}>
                  Убрать
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {pickerOpen && (
        <SpellPickerModal
          excludeIds={grantedSpells.map((cs) => cs.spell_id)}
          onPick={grantSpell}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {removeTarget && (
        <ConfirmDialog
          title="Убрать заклинание?"
          message={
            <>
              Вы точно хотите убрать{' '}
              <span className="font-semibold text-stone-100">
                {removeTarget.spell?.name ? sentenceCase(removeTarget.spell.name) : `Заклинание #${removeTarget.spell_id}`}
              </span>{' '}
              у персонажа? Это действие необратимо.
            </>
          }
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => removeSpell(removeTarget)}
        />
      )}
    </Section>
  )
}

function ItemGrantModal({ catalogItem, onConfirm, onClose }) {
  const [qty, setQty] = useState('1')

  return (
    <Modal title="Выдать предмет" subtitle={catalogItem?.name && sentenceCase(catalogItem.name)} onClose={onClose} size="sm">
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
      <div className="mt-4 modal-actions">
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

function ItemsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [infoItemId, setInfoItemId] = useState(null)
  const [addTarget, setAddTarget] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [qtyEdits, setQtyEdits] = useState({})

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })

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

  const quantityDraft = (ci) => qtyEdits[ci.id] ?? String(ci.quantity)
  const setQuantityDraft = (ci, v) => setQtyEdits((m) => ({ ...m, [ci.id]: v }))
  const commitQuantity = async (ci) => {
    const draft = qtyEdits[ci.id]
    if (draft == null) return
    const next = Math.max(1, Number(draft) || 1)
    setQtyEdits((m) => {
      const rest = { ...m }
      delete rest[ci.id]
      return rest
    })
    if (next === ci.quantity) return
    try {
      await charactersApi.gmPanel.items.update(character.id, ci.id, { quantity: next })
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
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          Инвентарь ({items.length})
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          + Выдать предмет
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Снаряжения пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((ci) => {
            return (
              <li key={ci.id} className="flex items-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => setInfoItemId(ci.item_id)}
                  className="link-ember min-w-0 flex-1 truncate text-left font-display text-sm font-bold"
                  title="Показать предмет"
                >
                  {ci.item?.name ? sentenceCase(ci.item.name) : `Предмет #${ci.item_id}`}
                </button>
                <input
                  type="number"
                  min={1}
                  value={quantityDraft(ci)}
                  onChange={(e) => setQuantityDraft(ci, e.target.value)}
                  onBlur={() => commitQuantity(ci)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  title="Количество"
                  className="h-[40px] w-24 shrink-0 rounded border border-stone-700 bg-stone-800/70 px-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
                />
                <button
                  type="button"
                  onClick={() => setConfirmTarget(ci)}
                  className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                  title="Убрать"
                >
                  <TrashIcon />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {pickerOpen && (
        <ItemPickerModal
          title="Выдать предмет"
          subtitle="Поиск и выбор предмета"
          excludeIds={new Set()}
          onPick={(it) => setAddTarget(it)}
          onClose={() => setPickerOpen(false)}
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
                «{confirmTarget.item?.name ? sentenceCase(confirmTarget.item.name) : `Предмет #${confirmTarget.item_id}`}»
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
    <div className="grid items-start gap-4 lg:grid-cols-[45fr_55fr]">
      <div className="min-w-0 space-y-4">
        <LevelSection character={character} onError={onError} reload={reload} />
        <HpSection character={character} onError={onError} reload={reload} />
        <ArmorProficienciesSection character={character} onError={onError} reload={reload} />
        <WeaponProficienciesSection character={character} onError={onError} reload={reload} />
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
        <GrantedSpellsSection character={character} onError={onError} reload={reload} />
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
