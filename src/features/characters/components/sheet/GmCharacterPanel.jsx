import CatalogSearchList from '@/features/catalog/components/CatalogSearchList.jsx'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { catalogApi } from '@/features/catalog/api.js'
import { catalog } from '@/features/catalog/catalog.js'
import {
  useCharacterAsiAdjustments,
  useCharacterFeats,
  useCharacterFeatures,
  useCharacterGmSpells,
  useCharacterItems,
  useCharacterMaxLevel,
  useCharacterProficiencies,
  useCharacterStats,
} from '@/features/characters/queries.js'
import { useFeatDetail, useSkills } from '@/features/catalog/queries.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import ProficiencyPicker from './ProficiencyPicker.jsx'
import SpellPickerModal from '@/features/catalog/components/editor/SpellPickerModal.jsx'
import ItemPickerModal from '@/features/catalog/components/editor/ItemPickerModal.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { effectBadges } from '@/lib/utils/featureEffects.js'
import { STATS, abilityByCode, abilityName } from '@/lib/utils/ability.js'
import { Badge, Button, ConfirmDialog, Input, RichText, Select, Skeleton } from '@/components/ui'
import { armorProficiencyLabels, label, sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'
import { scalingMarkdown } from '@/lib/utils/featureScaling.js'

function PlusIcon({ className = 'h-4 w-4' }) {
  return <LoreIcon name="plus" className={className} />
}

function TrashIcon() {
  return <LoreIcon name="trash" />
}

function Section({ title, action, count, children }) {
  return (
    <section className="gm-editor-section" aria-label={title}>
      {action ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="heading-sub">{title}{count != null && <span className="gm-section-count">{count}</span>}</h3>
          {action}
        </div>
      ) : (
        <h3 className="heading-sub">{title}</h3>
      )}
      {children}
    </section>
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

  // Потолок только растёт: бэк отвечает 400 на значение ≤ текущего потолка (без строки — ≤ уровня).
  const currentCap = Number(maxLevelData?.max_level ?? character.level) || 1
  const ceilingValid = Number.isFinite(Number(newCeiling)) && Number(newCeiling) > currentCap && Number(newCeiling) <= 20

  const raiseCeiling = async () => {
    const next = Number(newCeiling)
    if (!ceilingValid) return
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
            min={Math.min(20, currentCap + 1)}
            max="20"
            value={newCeiling}
            onChange={(e) => setNewCeiling(e.target.value)}
            placeholder={`> ${currentCap}`}
          />
          <Button size="sm" variant="ghost" disabled={ceilingBusy || !newCeiling || !ceilingValid} onClick={raiseCeiling}>
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
  // 0 бэк не принимает (422): корректировка без изменения бессмысленна.
  const amountValid = newAmount !== '' && Number.isFinite(parsedAmount) && parsedAmount !== 0 && parsedAmount >= adjustMin && parsedAmount <= adjustMax

  const invalidateStats = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.stats(Number(characterId)) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.combatStats(Number(characterId)) })
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
                  <LoreIcon name="undo" /> Откатить
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
    <Section title="Навыки и экспертиза" action={
      <ProficiencyPicker title="Добавить навык" options={addOptions} onPick={addSkill} disabled={addOptions.length === 0 || busyId !== null} addLabel="Добавить навык" />
    }>
      <p className="mb-3 text-sm text-stone-500">Владение добавляет бонус мастерства, экспертиза удваивает его.</p>
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
                <li key={p.skill_id} className="gm-skill-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-200">{skill ? skillName(skill) : `Навык #${p.skill_id}`}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{skill?.ability ? `${abilityLabel(skill.ability)} · ` : ''}{expert ? 'Двойной бонус мастерства' : 'Бонус мастерства'}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={expert}
                    aria-label={`Экспертиза: ${skill ? skillName(skill) : `Навык #${p.skill_id}`}`}
                    disabled={busyId !== null}
                    onClick={() => toggle(p.skill_id, !expert)}
                    className="lore-player-switch gm-skill-switch"
                  >
                    <span>Экспертиза</span>
                    <span className="lore-switch-track" aria-hidden="true" />
                  </button>
                  {removable && (
                    <button
                      type="button"
                      onClick={() => removeSkill(p.skill_id)}
                      disabled={busyId !== null}
                      className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50 disabled:opacity-50"
                      title="Убрать владение"
                      aria-label={`Убрать владение: ${skill ? skillName(skill) : `Навык #${p.skill_id}`}`}
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
  // Конкретные доспехи (item_id) здесь не редактируются — только категории.
  const armor = (proficienciesData?.armor ?? []).filter((a) => a.item_id == null)
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
        <ProficiencyPicker
          title="Добавить владение"
          options={addOptions}
          onPick={add}
          disabled={busyType !== null || addOptions.every((o) => o.disabled)}
          addLabel="Добавить владение"
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
                removable ? 'border-ember/70 bg-ember/10 text-stone-100' : 'border-stone-700/60 bg-stone-900/60 text-stone-200'
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
                  <LoreIcon name="close" />
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
        <ProficiencyPicker
          title="Добавить владение"
          options={addOptions}
          onPick={add}
          disabled={busyType !== null || addOptions.every((o) => o.disabled)}
          addLabel="Добавить владение"
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
                removable ? 'border-ember/70 bg-ember/10 text-stone-100' : 'border-stone-700/60 bg-stone-900/60 text-stone-200'
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
                  <LoreIcon name="close" />
                </button>
              )}
            </span>
          )
        })}
      </div>
    </Section>
  )
}

function GmFeatPickerModal({ grantedIds, level, abilityTotals, onPick, onClose }) {
  const [selectedFeat, setSelectedFeat] = useState(null)
  const featId = selectedFeat?.id ?? null
  const [increaseId, setIncreaseId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const detailId = featId ?? expandedId
  const detailQ = useFeatDetail(detailId)
  const detail = detailId ? detailQ.data : null

  // Те же правила доступа, что у игрока при выборе черты.
  const featPrereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (abilityTotals[f.prerequisite_ability] || 0) >= f.prerequisite_minimum_score
  }
  const featLevelOk = (f) => f.min_level == null || Number(f.min_level) <= Number(level)

  const currentFeat = selectedFeat

  // Варианты увеличения характеристик — эффекты «ability» в вариантах групп выбора черты
  // (choice_groups детали; их id бэк ждёт в ability_score_increase_id). «Любая
  // характеристика» (ability: null) сюда не идёт — её игрок называет при ответе на выбор.
  const increaseOptions = useMemo(() => {
    if (!currentFeat) return []
    return (detailQ.data?.choice_groups ?? []).flatMap((group) =>
      (group.options ?? []).flatMap((option) =>
        (option.effects ?? []).filter((e) => e.effect_type === 'ability').flatMap((e) => e.items ?? []),
      ),
    ).filter((item) => item.ability != null)
  }, [currentFeat, detailQ.data])

  const needsIncrease = increaseOptions.length > 0

  // Если черта даёт ровно один вариант — используем его автоматически, но id всё равно передаём явно.
  const confirmReady =
    !!currentFeat && !detailQ.isFetching && (!needsIncrease || increaseId != null || increaseOptions.length === 1)

  const confirm = () => {
    if (!currentFeat || (needsIncrease && increaseId == null && increaseOptions.length !== 1)) return
    const resolvedIncrease = needsIncrease
      ? increaseId ?? (increaseOptions.length === 1 ? increaseOptions[0].id : null)
      : null
    onPick(currentFeat, resolvedIncrease != null ? Number(resolvedIncrease) : null)
  }

  return (
    <Drawer
      bodyClassName="grant-picker-body"
      title="Выдать черту"
      subtitle="Как при выборе игрока: посмотрите черту и подтвердите выбор"
      onClose={onClose}
      footer={
        <div className="w-full space-y-3">
          {currentFeat && <p className="text-sm text-stone-200">Выбрано: {sentenceCase(currentFeat.name)}</p>}
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
                        onChange={() => setIncreaseId(ai.id)}
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
      {/* Черты, уже выданные персонажу, на повторную выдачу недоступны. */}
      <CatalogSearchList
        queryKey={queryKeys.pickers.feats}
        list={catalogApi.feats.list}
        filters={catalog.feats.filters}
        exclude={(f) => grantedIds.has(Number(f.id))}
        emptyText="Доступных черт нет."
      >
        {(available) => available.map((f) => {
          const ok = featPrereqOk(f) && featLevelOk(f)
          const selected = String(f.id) === String(featId)
          const expanded = String(expandedId) === String(f.id)
          const rowDetail = expanded ? detail : null
          return (
            <div
              key={f.id}
              className={`catalog-record-card grant-picker-card ${ok ? '' : 'opacity-60'}`}
              data-active={selected}
            >
              <div className="grant-picker-row">
                <button
                  type="button"
                  disabled={!ok}
                  onClick={() => {
                    setSelectedFeat(f)
                    setIncreaseId(null)
                    setExpandedId(null)
                  }}
                  className={`grant-picker-select ${ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  aria-pressed={selected}
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
                    className="grant-picker-expand"
                    aria-expanded={expanded}
                  >
                    <LoreIcon name="chevron" className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  </button>
                </span>
              </div>
              {expanded && (
                <div className="grant-picker-detail">
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
      </CatalogSearchList>
    </Drawer>
  )
}

function FeatureDetail({ featureId }) {
  const detailQ = useQuery({
    // FeatureResponse уже содержит ability_effects и effects_summary —
    // отдельный запрос за эффектами не нужен. Ключ — как у карточки справочника.
    queryKey: ['catalog', 'features', featureId],
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
  const [selected, setSelected] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  // source_type задаёт сам выбор (только OTHER) — такой фильтр не показываем.
  const filterDefs = catalog.features.filters.filter((f) => f.name !== 'source_type')

  return (
    <Drawer bodyClassName="grant-picker-body" title="Выдать особенность" subtitle="Особые свойства из справочника" onClose={onClose} footer={<div className="article-filter-actions"><Button variant="ghost" onClick={onClose}>Отмена</Button><Button disabled={!selected} onClick={() => onPick(selected)}>Выдать особенность</Button></div>}>
      <CatalogSearchList
        queryKey={queryKeys.pickers.features}
        list={catalogApi.features.list}
        filters={filterDefs}
        exclude={(f) => grantedIds.has(Number(f.id))}
        emptyText="Особенностей не найдено."
      >
        {(available) => available.map((f) => {
          const expanded = expandedId === f.id
          return (
            <div
              key={f.id}
              className="catalog-record-card grant-picker-card"
              data-active={selected?.id === f.id}
            >
              <div className="grant-picker-row">
                <button
                  type="button"
                  onClick={() => setSelected(f)}
                  aria-pressed={selected?.id === f.id}
                  className="grant-picker-select"
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
                    className="grant-picker-expand"
                  >
                    <LoreIcon name="chevron" className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                  </button>
                </span>
              </div>
              {expanded && (
                <div className="grant-picker-detail">
                  <FeatureDetail featureId={f.id} />
                </div>
              )}
            </div>
          )
        })}
      </CatalogSearchList>
    </Drawer>
  )
}

function FeatsSection({ character, onError }) {
  const queryClient = useQueryClient()
  const { data: charFeats = [] } = useCharacterFeats(character.id)
  const { data: stats } = useCharacterStats(character.id)
  const [featPickerOpen, setFeatPickerOpen] = useState(false)
  const [openFeatId, setOpenFeatId] = useState(null)

  // Эффекты выданной черты приходят так же, как у особенности:
  // группы — в cf.effects ([{ effect_type, items }]), уже отвеченные выборы — в cf.choices.
  const hasGrantedEffects = (cf) => {
    const flatHasAny = (cf.effects ?? []).length > 0
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

  // Черта — это грант: меняет владения, заклинания, характеристики, КД/скорость и
  // выборы. Префикс ['characters', id] обновляет всё это и сам лист разом.
  const invalidateGrant = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })

  const grantFeat = async (feat, increaseId) => {
    setFeatPickerOpen(false)
    try {
      await charactersApi.gmPanel.feats.add(character.id, {
        feat_id: Number(feat.id),
        ability_score_increase_id: increaseId ? Number(increaseId) : null,
      })
      await invalidateGrant()
    } catch (e) {
      onError(e)
    }
  }

  const removeFeat = async (charFeatId) => {
    try {
      await charactersApi.gmPanel.feats.remove(character.id, charFeatId)
      await invalidateGrant()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Черты" count={charFeats.length} action={<Button
          type="button"
          onClick={() => setFeatPickerOpen(true)}
          size="sm" variant="ghost"
        >
          <PlusIcon />Выдать черту
        </Button>}>


      {charFeats.length === 0 ? (
        <p className="text-sm text-stone-500">Черт нет.</p>
      ) : (
        <ul className="space-y-2">
          {charFeats.map((cf) => {
            const open = openFeatId === cf.id
            return (
              <li key={cf.id} className="gm-ability-card">
                <div className="gm-ability-card-header">
                  <button
                    type="button"
                    onClick={() => setOpenFeatId(open ? null : cf.id)}
                    aria-expanded={open}
                    className="gm-ability-toggle"
                  >
                    <LoreIcon name="chevron" className={`text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`} />
                    <span className="gm-ability-name">
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
                    size="sm"
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
                    className="gm-ability-content"
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

function FeaturesSection({ character, onError }) {
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

  // Как и у черт: выданная особенность влияет на владения, заклинания, характеристики и
  // выборы, поэтому обновляем весь префикс персонажа (в нём и сам лист).
  const invalidateFeatures = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })

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
  // FeatureResponse: группы [{ effect_type, items }] лежат в cf.effects, плюс уже отвеченные выборы — в cf.choices.Бейдж «Даёт эффекты»
  // просто проверяет, есть ли там хоть что-то непустое.
  const hasGrantedEffects = (cf) => {
    const flatHasAny = (cf.effects ?? []).length > 0
    const choicesHaveAny = (cf.choices ?? []).some((choice) =>
      Object.entries(choice).some(
        ([key, value]) => !key.startsWith('choice_') && Array.isArray(value) && value.length > 0,
      ),
    )
    return flatHasAny || choicesHaveAny
  }
  const hasGrantedChoices = (cf) => (cf.choices ?? []).length > 0

  return (
    <Section title="Особенности" count={otherFeatures.length} action={<Button
          type="button"
          onClick={() => setFeaturePickerOpen(true)}
          size="sm" variant="ghost"
        >
          <PlusIcon />Выдать особенность
        </Button>}>


      {otherFeatures.length === 0 ? (
        <p className="text-sm text-stone-500">Особенностей нет.</p>
      ) : (
        <ul className="space-y-2">
          {otherFeatures.map((cf) => {
            const open = openFeatureId === cf.id
            return (
              <li key={cf.id} className="gm-ability-card">
                <div className="gm-ability-card-header">
                  <button
                    type="button"
                    onClick={() => setOpenFeatureId(open ? null : cf.id)}
                    aria-expanded={open}
                    className="gm-ability-toggle"
                  >
                    <LoreIcon name="chevron" className={`text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`} />
                    <span className="gm-ability-name">{featureName(cf)}</span>
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
                    <Button type="button" variant="danger" size="sm" onClick={() => setRemoveTarget(cf)}>
                      Убрать
                    </Button>
                  </div>
                </div>
                {open && (cf.feature?.description || cf.feature?.effects_summary || cf.feature?.scaling || cf.notes) && (
                  <div className="gm-ability-content">
                    {cf.feature?.description || cf.feature?.effects_summary || cf.feature?.scaling ? (
                      <RichText
                        value={cf.feature?.description}
                        tail={[scalingMarkdown(cf.feature?.scaling, character.level), cf.feature?.effects_summary]}
                      />
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
// (homebrew-бонус) через modalreuse SpellPickerModal из каталога. Заклинания от
// особенностей/черт здесь не показываются — они уходят только вместе с особенностью.
function GrantedSpellsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: grantedSpells = [] } = useCharacterGmSpells(character.id)
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

  const removeSpell = async (sp) => {
    setRemoveTarget(null)
    try {
      await charactersApi.gmPanel.spells.remove(character.id, sp.id)
      await invalidate()
    } catch (e) {
      onError(e)
    }
  }

  return (
    <Section title="Дополнительные заклинания" count={grantedSpells.length} action={<Button
          type="button"
          onClick={() => setPickerOpen(true)}
          size="sm" variant="ghost"
        >
          <PlusIcon />Выдать заклинание
        </Button>}>


      {grantedSpells.length === 0 ? (
        <p className="text-sm text-stone-500">Дополнительных заклинаний нет.</p>
      ) : (
        <ul className="space-y-2">
          {grantedSpells.map((sp) => (
            <li key={sp.id} className="gm-ability-card gm-ability-card-header">
              <div className="min-w-0 flex-1">
                <p className="gm-ability-name">
                  {sp.name ? sentenceCase(sp.name) : `Заклинание #${sp.id}`}
                </p>
                {sp.school && (
                  <span className="text-xs text-stone-500">{label(sp.school)}</span>
                )}
              </div>
              <Button type="button" variant="danger" size="sm" onClick={() => setRemoveTarget(sp)}>
                Убрать
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <SpellPickerModal
          drawer
          excludeIds={grantedSpells.map((sp) => sp.id)}
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
                {removeTarget.name ? sentenceCase(removeTarget.name) : `Заклинание #${removeTarget.id}`}
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

function ItemFlagToggle({ on, label, title, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className={`sheet-chip shrink-0 !py-0.5 text-[11px] ${on ? 'sheet-chip_on' : ''}`}
    >
      <span className="sheet-chip__dot" />
      {label}
    </button>
  )
}

function ItemsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [infoItemId, setInfoItemId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [qtyEdits, setQtyEdits] = useState({})

  // Экипировка и настройка меняют расчётные КД и скорость.
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.characters.combatStats(Number(character.id)) })
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

  // 409: предмет не требует настройки или уже настроены 3 предмета.
  const toggleFlag = async (ci, field) => {
    try {
      await charactersApi.gmPanel.items.update(character.id, ci.id, { [field]: !ci[field] })
      await invalidate()
      await reload()
    } catch (e) {
      if (e?.status === 409 && field === 'is_attuned') {
        const err = new Error('Настроиться нельзя: предмет не требует настройки или уже настроены 3 предмета.')
        err.status = e.status
        err.data = e.data
        onError(err)
      } else onError(e)
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
    <Section title="Снаряжение персонажа" count={items.length} action={<Button
          type="button"
          onClick={() => setPickerOpen(true)}
          size="sm" variant="ghost"
        >
          <PlusIcon />Выдать предмет
        </Button>}>


      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Снаряжения пока нет.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((ci) => {
            return (
              <li key={ci.id} className="gm-ability-card gm-ability-card-header">
                <button
                  type="button"
                  onClick={() => setInfoItemId(ci.item_id)}
                  className="gm-ability-name min-w-0 flex-1 text-left hover:text-ember"
                  title="Показать предмет"
                >
                  {ci.item?.name ? sentenceCase(ci.item.name) : `Предмет #${ci.item_id}`}
                </button>
                <ItemFlagToggle on={ci.is_equipped} label="Экип." title="Экипирован" onClick={() => toggleFlag(ci, 'is_equipped')} />
                {(ci.item?.requires_attunement || ci.is_attuned) && (
                  <ItemFlagToggle on={ci.is_attuned} label="Настр." title="Настроен" onClick={() => toggleFlag(ci, 'is_attuned')} />
                )}
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
          drawer
          title="Выдать предмет"
          subtitle="Поиск и выбор предмета"
          excludeIds={new Set()}
          onPick={(it, qty) => addItem(it, qty)}
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

    </Section>
  )
}

export default function GmCharacterPanel({ character, onError, reload }) {
  const [tab, setTab] = useState('main')
  return (
    <div className="gm-character-panel">
      <EditorTabs tabs={[['main', 'Основное'], ['stats', 'Характеристики'], ['abilities', 'Умения'], ['equipment', 'Снаряжение']]} value={tab} onChange={setTab} label="Разделы редактора персонажа" />
      <div role="tabpanel" aria-label="Основное" hidden={tab !== 'main'} className="article-editor-panel gm-editor-sections">
        <LevelSection character={character} onError={onError} reload={reload} />
        <HpSection character={character} onError={onError} reload={reload} />
      </div>
      <div role="tabpanel" aria-label="Характеристики" hidden={tab !== 'stats'} className="article-editor-panel gm-editor-sections">
        <StatsSection character={character} onError={onError} reload={reload} />
        <ExpertiseSection character={character} onError={onError} reload={reload} />
        <ArmorProficienciesSection character={character} onError={onError} reload={reload} />
        <WeaponProficienciesSection character={character} onError={onError} reload={reload} />
      </div>
      <div role="tabpanel" aria-label="Умения" hidden={tab !== 'abilities'} className="article-editor-panel gm-editor-sections">
        <FeatsSection character={character} onError={onError} />
        <FeaturesSection character={character} onError={onError} />
        <GrantedSpellsSection character={character} onError={onError} reload={reload} />
      </div>
      <div role="tabpanel" aria-label="Снаряжение" hidden={tab !== 'equipment'} className="article-editor-panel gm-editor-sections">
        <ItemsSection character={character} onError={onError} reload={reload} />
      </div>
    </div>
  )
}
