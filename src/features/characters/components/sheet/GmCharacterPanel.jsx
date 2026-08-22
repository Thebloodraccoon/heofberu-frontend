import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import {
  useCanLevelUp,
  useCharacterAsiAdjustments,
  useCharacterFeats,
  useCharacterGmStats,
  useCharacterItems,
  useCharacterMaxLevel,
} from '@/features/characters/queries.js'
import { useFeats, useFeatsFull, useItems, useRaceDetail, useSkills, useSubraceDetail } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { ASI_LEVELS, STATS, bonusMap } from '@/lib/utils/ability.js'
import { statsToTotals } from '@/lib/utils/characterCreate.js'
import { Button, ConfirmDialog, Input, Select } from '@/components/ui'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'
import { label } from '@/lib/i18n/index.js'

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
      <p className="sheet-section-label !mt-0">{title}</p>
      {children}
    </div>
  )
}

const ABILITY_CODE_BY_KEY = Object.fromEntries(STATS.map((s) => [s.key, s.code]))

function HpSection({ character, onError, reload }) {
  const [maxHp, setMaxHp] = useState(null)
  const [delta, setDelta] = useState('')
  const [tempHp, setTempHp] = useState(null)
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

  const applyMaxHp = () =>
    run(async () => {
      await charactersApi.gmPanel.maxHp(character.id, { max_hp: Number(maxHp) })
      setMaxHp(null)
    })

  const applyDelta = (sign) =>
    run(() => charactersApi.hp(character.id, { delta: sign * Math.abs(Number(delta)) })).then(() => setDelta(''))

  const applyTempHp = () =>
    run(async () => {
      await charactersApi.hp(character.id, { temp_hp: Number(tempHp) })
      setTempHp(null)
    })

  return (
    <Section title="Хиты">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-200">
        <span>
          Текущие: <b>{character.current_hp}</b> / {character.max_hp}
        </span>
        {character.temp_hp > 0 && (
          <span className="text-emerald-300">Временные: +{character.temp_hp}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min="0"
          className="!w-24"
          value={delta}
          placeholder="кол-во"
          onChange={(e) => setDelta(e.target.value)}
        />
        <Button size="sm" variant="danger" disabled={busy || !delta} onClick={() => applyDelta(-1)}>
          Урон
        </Button>
        <Button size="sm" disabled={busy || !delta} onClick={() => applyDelta(1)}>
          Лечение
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min="0"
          className="!w-24"
          value={tempHp ?? ''}
          placeholder="врем. ХП"
          onChange={(e) => setTempHp(e.target.value)}
        />
        <Button size="sm" variant="ghost" disabled={busy || tempHp === null || tempHp === ''} onClick={applyTempHp}>
          Выдать временные ХП
        </Button>
      </div>

      <div className="mt-4 border-t border-stone-800 pt-3">
        <p className="mb-2 text-xs uppercase tracking-wide text-stone-500">Максимум ХП</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-200">{character.max_hp} HP</span>
          <Input
            type="number"
            min="0"
            className="!w-24"
            value={maxHp ?? ''}
            placeholder="новое"
            onChange={(e) => setMaxHp(e.target.value)}
          />
          <Button size="sm" disabled={busy || maxHp === null || maxHp === ''} onClick={applyMaxHp}>
            Задать
          </Button>
        </div>
      </div>
    </Section>
  )
}

function LevelSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: canLevelUp } = useCanLevelUp(character.id)
  const { data: maxLevelData } = useCharacterMaxLevel(character.id)
  const featsQ = useFeatsFull()
  const [asiPromptLevel, setAsiPromptLevel] = useState(null)
  const [newCeiling, setNewCeiling] = useState('')
  const [ceilingBusy, setCeilingBusy] = useState(false)

  const levelUp = async (choice) => {
    setAsiPromptLevel(null)
    try {
      await charactersApi.progression.levelUp(character.id, choice ? { choice } : {})
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(character.id), 'progression', 'can-level-up'] })
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const onLevelUpClick = async () => {
    const nextLevel = (Number(character.level) || 1) + 1
    if (ASI_LEVELS.includes(nextLevel)) {
      await featsQ.refetch().catch(() => null)
      setAsiPromptLevel(nextLevel)
    } else {
      levelUp(null)
    }
  }

  const raiseCeiling = async () => {
    setCeilingBusy(true)
    try {
      await charactersApi.gmPanel.maxLevel.set(character.id, { max_level: Number(newCeiling) })
      setNewCeiling('')
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(character.id), 'gm-panel', 'max-level'] })
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(character.id), 'progression', 'can-level-up'] })
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setCeilingBusy(false)
    }
  }

  return (
    <Section title="Уровень персонажа">
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-200">
        <span>
          Текущий уровень: <b>{character.level}</b>
        </span>
        <span className="text-stone-500">·</span>
        <span>Потолок: {maxLevelData?.max_level ?? '—'}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canLevelUp?.can_level_up ? (
          <Button size="sm" onClick={onLevelUpClick}>
            Повысить до ур. {(Number(character.level) || 1) + 1}
          </Button>
        ) : (
          <span className="text-xs text-stone-500">Повышение недоступно — сначала поднимите потолок.</span>
        )}
        <label className="flex items-center gap-1.5 text-xs text-stone-400">
          Новый потолок:
          <Input
            type="number"
            min="1"
            max="20"
            className="!w-20"
            value={newCeiling}
            onChange={(e) => setNewCeiling(e.target.value)}
          />
        </label>
        <Button size="sm" variant="ghost" disabled={ceilingBusy || !newCeiling} onClick={raiseCeiling}>
          Поднять потолок
        </Button>
      </div>

      {asiPromptLevel && (
        <AsiChoiceModal
          level={asiPromptLevel}
          abilityTotals={statsToTotals(character.ability_scores)}
          feats={featsQ.data ?? []}
          featsLoading={featsQ.isFetching}
          onCancel={() => setAsiPromptLevel(null)}
          onConfirm={levelUp}
        />
      )}
    </Section>
  )
}

function StatsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const characterId = character.id
  const { data: stats } = useCharacterGmStats(characterId)
  const { data: adjustments = [] } = useCharacterAsiAdjustments(characterId)
  // Выборы улучшений на уровнях (ASI) — аудит с бэкенда.
  const { data: asiChoices = [] } = useQuery({
    queryKey: queryKeys.characters.asiChoices(Number(characterId)),
    queryFn: () => charactersApi.progression.asiChoices(Number(characterId)),
    enabled: !!characterId,
  })
  // Расовые/подрасовые бонусы — чтобы показать, откуда что взялось.
  const { data: raceDetail } = useRaceDetail(character.race_id)
  const { data: subraceDetail } = useSubraceDetail(character.race_id, character.subrace_id)
  const [increases, setIncreases] = useState([])
  const [amounts, setAmounts] = useState({})
  const [busy, setBusy] = useState(false)

  // Разбор итогового значения по каждой характеристике.
  const breakdownByCode = useMemo(() => {
    const raceBonus = bonusMap(raceDetail?.ability_bonuses)
    const subraceBonus = bonusMap(subraceDetail?.ability_bonuses)
    const levelUp = {}
    for (const choice of asiChoices) {
      for (const inc of choice.increases ?? []) {
        levelUp[inc.ability] = (levelUp[inc.ability] ?? 0) + inc.amount
      }
    }
    const gm = {}
    for (const adj of adjustments) {
      for (const inc of adj.increases ?? []) {
        gm[inc.ability] = (gm[inc.ability] ?? 0) + inc.amount
      }
    }
    return { raceBonus, subraceBonus, levelUp, gm }
  }, [raceDetail, subraceDetail, asiChoices, adjustments])

  const toggleAbility = (code) =>
    setIncreases((prev) => (prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]))

  const addAdjustment = async () => {
    const payload = increases.map((code) => ({
      ability: Object.entries(ABILITY_CODE_BY_KEY).find(([, c]) => c === code)?.[0] ?? code,
      amount: Number(amounts[code] ?? 1),
    }))
    if (payload.length === 0) return
    setBusy(true)
    try {
      await charactersApi.gmPanel.asi.add(characterId, { increases: payload })
      setIncreases([])
      setAmounts({})
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(characterId), 'gm-panel'] })
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
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(characterId), 'gm-panel'] })
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const chip = (text, tone = 'dim') => (
    <span
      key={text}
      className={`rounded px-1.5 py-0.5 text-[10px] ${
        tone === 'good'
          ? 'bg-emerald-900/50 text-emerald-200'
          : tone === 'bad'
            ? 'bg-red-900/40 text-red-200'
            : 'bg-stone-800 text-stone-400'
      }`}
    >
      {text}
    </span>
  )

  return (
    <Section title="Характеристики">
      {!stats && <p className="text-sm text-stone-500">Загрузка...</p>}
      {stats && (
        <ul className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {STATS.map((s) => {
            const view = stats[s.key]
            if (!view) return null
            const { raceBonus, subraceBonus, levelUp, gm } = breakdownByCode
            const parts = []
            if (raceBonus[s.code]) parts.push(chip(`Раса +${raceBonus[s.code]}`, 'good'))
            if (subraceBonus[s.code]) parts.push(chip(`Подраса +${subraceBonus[s.code]}`, 'good'))
            if (levelUp[s.code]) parts.push(chip(`Уровни +${levelUp[s.code]}`, 'good'))
            if (gm[s.code]) parts.push(chip(`ГМ ${gm[s.code] > 0 ? `+${gm[s.code]}` : gm[s.code]}`, 'bad'))
            const known =
              view.base +
              (raceBonus[s.code] ?? 0) +
              (subraceBonus[s.code] ?? 0) +
              (levelUp[s.code] ?? 0) +
              (gm[s.code] ?? 0)
            const other = view.total - known
            if (other !== 0) parts.push(chip(`Прочее ${other > 0 ? `+${other}` : other}`))
            return (
              <li key={s.key} className="rounded border border-stone-800 bg-stone-900/70 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-stone-300">{s.label}</span>
                  <span className="font-mono text-sm text-stone-100">
                    {view.base} → <b className="text-ember">{view.total}</b>
                  </span>
                </div>
                {parts.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{parts}</div>}
                {parts.length === 0 && <p className="mt-1 text-[11px] text-stone-600">Без бонусов</p>}
              </li>
            )
          })}
        </ul>
      )}

      <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Добавить изменение (ГМ)</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {STATS.map((s) => (
          <button
            key={s.code}
            type="button"
            onClick={() => toggleAbility(s.code)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              increases.includes(s.code)
                ? 'border-ember bg-ember/10 text-ember'
                : 'border-stone-700 text-stone-400 hover:border-stone-500'
            }`}
          >
            {s.label}
          </button>
        ))}
        {increases.map((code) => (
          <label key={`amt-${code}`} className="flex items-center gap-1 text-xs text-stone-400">
            ±
            <Input
              type="number"
              className="!w-16"
              value={amounts[code] ?? ''}
              placeholder="0"
              onChange={(e) => setAmounts({ ...amounts, [code]: e.target.value })}
            />
          </label>
        ))}
        <Button size="sm" disabled={busy || increases.length === 0} onClick={addAdjustment}>
          Применить
        </Button>
      </div>

      {adjustments.length > 0 && (
        <>
          <p className="mb-1.5 mt-3 text-xs uppercase tracking-wide text-stone-500">Правки ГМа</p>
          <ul className="space-y-1">
            {adjustments.map((adj) => (
              <li key={adj.id} className="flex items-center justify-between rounded border border-stone-800 px-2.5 py-1.5 text-xs text-stone-300">
                <span>
                  {(adj.increases ?? [])
                    .map((inc) => `${abilityLabel(inc.ability)} ${inc.amount > 0 ? `+${inc.amount}` : inc.amount}`)
                    .join(', ') || 'без изменений'}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-red-300 transition hover:text-red-200"
                  onClick={() => removeAdjustment(adj.id)}
                  title="Откатить"
                >
                  ✕ Откатить
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}

// Бэкенд присылает полные ключи ('strength'), приводим к коду STAT'а.
function abilityLabel(ability) {
  const code = ABILITY_CODE_BY_KEY[String(ability).toLowerCase()] ?? String(ability).toUpperCase()
  return STATS.find((s) => s.code === code)?.label ?? code
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

  if (proficiencies.length === 0) return <p className="text-sm text-stone-500">У персонажа нет владений навыками.</p>

  return (
    <Section title="Навыки и экспертиза">
      <p className="-mt-1 mb-2 text-xs text-stone-500">
        Нажмите на навык с ★, чтобы снять экспертизу; обычный навык — чтобы дать её. Бонус мастерства удваивается.
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {proficiencies.map((p) => {
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
                  {skill?.name ?? `Навык #${p.skill_id}`}
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

function FeatsFeaturesSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: charFeats = [] } = useCharacterFeats(character.id)
  const { data: catalogFeats = [] } = useFeats({ size: 100 })
  const [featId, setFeatId] = useState('')

  const grantFeat = async () => {
    try {
      await charactersApi.gmPanel.feats.add(character.id, { feat_id: Number(featId) })
      setFeatId('')
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
    <Section title="Черты персонажа">
      <ul className="mb-2 space-y-1">
        {charFeats.length === 0 && <li className="text-sm text-stone-500">Черт нет.</li>}
        {charFeats.map((cf) => (
          <li key={cf.id} className="flex items-center justify-between rounded border border-stone-800 px-2.5 py-1.5 text-sm text-stone-200">
            <span className="min-w-0 truncate">{cf.feat?.name || `Черта #${cf.feat_id}`}</span>
            <button
              type="button"
              className="shrink-0 text-red-300 transition hover:text-red-200"
              onClick={() => removeFeat(cf.id)}
              title="Снять черту"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Select value={featId} onChange={(e) => setFeatId(e.target.value)} className="!w-auto min-w-40 flex-1">
          <option value="">Выберите черту...</option>
          {catalogFeats.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
        <Button size="sm" disabled={!featId} onClick={grantFeat}>Выдать</Button>
      </div>
    </Section>
  )
}

function ItemsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const { data: catalog = [] } = useItems({ size: 100 })
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [confirmTarget, setConfirmTarget] = useState(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })

  const itemById = useMemo(() => new Map(catalog.map((it) => [Number(it.id), it])), [catalog])

  const addItem = async () => {
    try {
      await charactersApi.gmPanel.items.add(character.id, {
        item_id: Number(itemId),
        quantity: Math.max(0, Number(quantity) || 1),
      })
      setItemId('')
      setQuantity('1')
      await invalidate()
      await reload()
    } catch (e) {
      onError(e)
    }
  }

  const patchItem = async (charItemId, body) => {
    try {
      await charactersApi.gmPanel.items.update(character.id, charItemId, body)
      await invalidate()
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
      {items.length === 0 ? (
        <p className="-mt-1 mb-3 text-sm text-stone-500">Снаряжения пока нет.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {items.map((ci) => {
            const catalogItem = itemById.get(Number(ci.item_id))
            return (
              <div key={ci.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-100">
                      {catalogItem?.name ?? `Предмет #${ci.item_id}`}
                    </p>
                    {catalogItem?.item_type && (
                      <p className="mt-0.5 text-xs text-stone-400">{label(catalogItem.item_type)}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-stone-400">
                      кол-во
                      <Input
                        type="number"
                        min="0"
                        className="!w-16 !py-1"
                        defaultValue={ci.quantity}
                        onBlur={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0)
                          if (v !== ci.quantity) patchItem(ci.id, { quantity: v })
                        }}
                      />
                    </label>
                    <Button type="button" variant="danger" size="xs" onClick={() => setConfirmTarget(ci)}>
                      Убрать
                    </Button>
                  </div>
                </div>
                {(ci.is_equipped || ci.is_attuned) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ci.is_equipped && (
                      <button
                        type="button"
                        onClick={() => patchItem(ci.id, { is_equipped: false })}
                        className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"
                        title="Снять отметку"
                      >
                        <span className="sheet-chip__dot" />Экипировано ✕
                      </button>
                    )}
                    {ci.is_attuned && (
                      <button
                        type="button"
                        onClick={() => patchItem(ci.id, { is_attuned: false })}
                        className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"
                        title="Снять настройку"
                      >
                        <span className="sheet-chip__dot" />Настроено ✕
                      </button>
                    )}
                  </div>
                )}
                {!ci.is_equipped && (
                  <button
                    type="button"
                    onClick={() => patchItem(ci.id, { is_equipped: true })}
                    className="mt-2 rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                  >
                    Экипировать
                  </button>
                )}
                {!ci.is_attuned && (
                  <button
                    type="button"
                    onClick={() => patchItem(ci.id, { is_attuned: true })}
                    className="ml-2 rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                  >
                    Настроить
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-stone-700/70 pt-3">
        <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="!w-auto min-w-40 flex-1">
          <option value="">Добавить предмет из справочника...</option>
          {catalog.map((it) => (
            <option key={it.id} value={it.id}>{it.name}</option>
          ))}
        </Select>
        <Input
          type="number"
          min="0"
          className="!w-20"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          title="Количество"
        />
        <Button size="sm" disabled={!itemId} onClick={addItem}>Выдать</Button>
      </div>

      {confirmTarget && (
        <ConfirmDialog
          title="Убрать предмет?"
          message={
            <>
              Вы точно хотите убрать{' '}
              <span className="font-semibold text-stone-100">
                «{itemById.get(Number(confirmTarget.item_id))?.name ?? `Предмет #${confirmTarget.item_id}`}»
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

const SECTIONS = [
  { id: 'level', label: 'Уровень' },
  { id: 'hp', label: 'Хиты' },
  { id: 'stats', label: 'Характеристики' },
  { id: 'skills', label: 'Навыки' },
  { id: 'feats', label: 'Черты' },
  { id: 'items', label: 'Снаряжение' },
]

export default function GmCharacterPanel({ character, onError, reload, section, onSectionChange }) {
  const [internalSection, setInternalSection] = useState('level')
  const active = section ?? internalSection
  const setActive = onSectionChange ?? setInternalSection

  const renderSection = () => {
    switch (active) {
      case 'level':
        return <LevelSection character={character} onError={onError} reload={reload} />
      case 'hp':
        return <HpSection character={character} onError={onError} reload={reload} />
      case 'stats':
        return <StatsSection character={character} onError={onError} reload={reload} />
      case 'skills':
        return <ExpertiseSection character={character} onError={onError} reload={reload} />
      case 'feats':
        return <FeatsFeaturesSection character={character} onError={onError} reload={reload} />
      case 'items':
        return <ItemsSection character={character} onError={onError} reload={reload} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Что редактируем">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === s.id}
            onClick={() => setActive(s.id)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              active === s.id
                ? 'bg-ember font-medium text-white'
                : 'border border-stone-700 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {renderSection()}
    </div>
  )
}
