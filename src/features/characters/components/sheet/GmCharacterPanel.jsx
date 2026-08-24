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
import { Button, ConfirmDialog, Field, Input, Modal, Select, TextArea } from '@/components/ui'
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

      <div className="mt-4 flex gap-2">
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
      <p className="mt-1.5 text-center text-[11px] text-stone-500">
        Положительное число — лечение, отрицательное — урон.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-stone-700/70 pt-4">
        <button type="button" className="sheet-btn" disabled={busy} onClick={() => doRest('short')}>
          Короткий отдых
        </button>
        <button type="button" className="sheet-btn" disabled={busy} onClick={() => doRest('long')}>
          Длинный отдых
        </button>
      </div>

      <div className="mt-4 space-y-3 border-t border-stone-700/70 pt-4">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Временные ХП</p>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              className="!w-28"
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
              className="!w-28"
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
  const { data: featsCatalog = [] } = useFeats({ size: 100 })
  const [newAbility, setNewAbility] = useState('strength')
  const [newAmount, setNewAmount] = useState('')
  const [busy, setBusy] = useState(false)

  // Итог = база (уже включает выборы уровней и правки ГМа) + раса + подраса
  // (+ бонусы черт — остаются в остатке).
  const bonusByCode = useMemo(() => {
    const raceBonus = bonusMap(raceDetail?.ability_bonuses)
    const subraceBonus = bonusMap(subraceDetail?.ability_bonuses)
    return { raceBonus, subraceBonus }
  }, [raceDetail, subraceDetail])

  const featNameById = useMemo(() => new Map(featsCatalog.map((f) => [Number(f.id), f.name])), [featsCatalog])

  const addAdjustment = async () => {
    if (!newAbility || newAmount === '') return
    setBusy(true)
    try {
      await charactersApi.gmPanel.asi.add(characterId, {
        increases: [{ ability: newAbility, amount: Number(newAmount) }],
      })
      setNewAmount('')
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
            const { raceBonus, subraceBonus } = bonusByCode
            const parts = []
            if (raceBonus[s.code]) parts.push(chip(`Раса +${raceBonus[s.code]}`, 'good'))
            if (subraceBonus[s.code]) parts.push(chip(`Подраса +${subraceBonus[s.code]}`, 'good'))
            const known = view.base + (raceBonus[s.code] ?? 0) + (subraceBonus[s.code] ?? 0)
            const other = view.total - known
            if (other !== 0) parts.push(chip(`Черты и прочее ${other > 0 ? `+${other}` : other}`))
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

      {/* Выборы игрока на уровнях улучшений */}
      <p className="mb-1.5 mt-4 border-t border-stone-800 pt-3 text-xs uppercase tracking-wide text-stone-500">
        Выборы игрока на уровнях
      </p>
      {asiChoices.length === 0 ? (
        <p className="text-xs text-stone-600">Улучшений характеристик пока не было.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {asiChoices.map((choice) => (
            <li key={choice.id} className="flex items-center justify-between gap-2 rounded border border-stone-800 px-2.5 py-1.5 text-xs">
              <span className="shrink-0 font-medium text-stone-200">Уровень {choice.class_level}</span>
              <span className="min-w-0 flex-1 truncate text-right text-stone-400">
                {choice.choice_type === 'ASI'
                  ? (choice.increases ?? [])
                      .map((inc) => `${abilityLabel(inc.ability)} ${inc.amount > 0 ? `+${inc.amount}` : inc.amount}`)
                      .join(', ') || 'улучшение характеристик'
                  : `Черта: ${featNameById.get(Number(choice.feat_id)) ?? `#${choice.feat_id}`}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Правки ГМа */}
      {adjustments.length > 0 && (
        <>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Правки ГМа</p>
          <ul className="mb-3 space-y-1">
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
        </>
      )}

      {/* Добавление одной правки за раз */}
      <div className="mt-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
        <Button size="sm" disabled={busy || !newAbility || newAmount === ''} onClick={addAdjustment}>
          Добавить характеристику
        </Button>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          Работает как выбор игрока при улучшении характеристик, но не привязан к уровню и не даёт черту.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-stone-400">
            Характеристика
            <Select value={newAbility} onChange={(e) => setNewAbility(e.target.value)} className="!w-auto">
              {STATS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-stone-400">
            Изменение ±
            <Input
              type="number"
              className="!w-20"
              value={newAmount}
              placeholder="+1 / −1"
              onChange={(e) => setNewAmount(e.target.value)}
            />
          </label>
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

function FeatPickerModal({ feats, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return feats
    return feats.filter((f) => String(f.name ?? '').toLowerCase().includes(q))
  }, [feats, query])

  return (
    <Modal title="Выдать черту" subtitle="Поиск по справочнику черт" onClose={onClose} size="md" scroll>
      <Input
        type="search"
        placeholder="Поиск черты..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {filtered.length === 0 && <p className="text-sm text-stone-500">Ничего не найдено.</p>}
        {filtered.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPick(f)}
            className="w-full rounded-lg border border-stone-700/60 bg-stone-900/60 p-3 text-left transition hover:border-ember/50"
          >
            <p className="text-sm font-medium text-stone-100">{f.name}</p>
            {f.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{f.description}</p>
            )}
          </button>
        ))}
      </div>
    </Modal>
  )
}

function FeatsFeaturesSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: charFeats = [] } = useCharacterFeats(character.id)
  const { data: catalogFeats = [] } = useFeats({ size: 100 })
  const [pickerOpen, setPickerOpen] = useState(false)

  const grantFeat = async (feat) => {
    setPickerOpen(false)
    try {
      await charactersApi.gmPanel.feats.add(character.id, { feat_id: Number(feat.id) })
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
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-400">Черт: {charFeats.length}</p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          Добавить...
        </button>
      </div>

      {charFeats.length === 0 ? (
        <p className="text-sm text-stone-500">Черт нет.</p>
      ) : (
        <ul className="space-y-2">
          {charFeats.map((cf) => (
            <li key={cf.id} className="flex items-center justify-between gap-2 rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{cf.feat?.name || `Черта #${cf.feat_id}`}</p>
                {cf.feat?.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{cf.feat.description}</p>
                )}
              </div>
              <Button type="button" variant="danger" size="xs" className="shrink-0" onClick={() => removeFeat(cf.id)}>
                Убрать
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && (
        <FeatPickerModal feats={catalogFeats} onPick={grantFeat} onClose={() => setPickerOpen(false)} />
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
            ������
          </Button>
          <Button type="button" onClick={() => onSave(edit)}>
            ���������
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="����������">
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
            �����������
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm text-stone-200">
            <input
              type="checkbox"
              checked={edit.is_attuned}
              onChange={(e) => setEdit({ ...edit, is_attuned: e.target.checked })}
              className="size-4 accent-ember"
            />
            ���������
          </label>
        </div>
      </div>
      <Field label="�������">
        <TextArea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="�������������" />
      </Field>
      {catalogItem?.description && (
        <p className="line-clamp-3 text-xs text-stone-500">{catalogItem.description}</p>
      )}
    </Modal>
  )
}

function ItemPickerModal({ catalog, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [quantity, setQuantity] = useState('1')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((it) => String(it.name ?? '').toLowerCase().includes(q))
  }, [catalog, query])

  return (
    <Modal
      title="�������� �������"
      subtitle="����� �� ����������� ���������"
      onClose={onClose}
      size="md"
      scroll
      footer={
        <>
          <span className="flex items-center gap-1.5 text-xs text-stone-400">
            ����������
            <Input type="number" min="0" className="!w-20" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </span>
        </>
      }
    >
      <Input type="search" placeholder="����� ��������..." value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="mt-3 max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {filtered.length === 0 && <p className="text-sm text-stone-500">������ �� �������.</p>}
        {filtered.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() =>
              onPick(it, Math.max(0, Number(quantity) || 1))
            }
            className="w-full rounded-lg border border-stone-700/60 bg-stone-900/60 p-3 text-left transition hover:border-ember/50"
          >
            <p className="text-sm font-medium text-stone-100">{it.name}</p>
            {it.item_type && <p className="mt-0.5 text-xs text-stone-500">{label(it.item_type)}</p>}
          </button>
        ))}
      </div>
    </Modal>
  )
}

function ItemsSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: items = [] } = useCharacterItems(character.id)
  const { data: catalog = [] } = useItems({ size: 100 })
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })

  const itemById = useMemo(() => new Map(catalog.map((it) => [Number(it.id), it])), [catalog])

  const addItem = async (catalogItem, qty) => {
    setPickerOpen(false)
    try {
      await charactersApi.gmPanel.items.add(character.id, { item_id: Number(catalogItem.id), quantity: qty })
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
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <p className="text-sm text-stone-400">Предметов: {items.length}</p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          Добавить...
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Снаряжения пока нет.</p>
      ) : (
        <div className="space-y-3">
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
                    <span className="text-sm text-stone-300">× {ci.quantity}</span>
                    <Button type="button" size="xs" onClick={() => setEditTarget(ci)}>
                      Изменить
                    </Button>
                    <Button type="button" variant="danger" size="xs" onClick={() => setConfirmTarget(ci)}>
                      Убрать
                    </Button>
                  </div>
                </div>
                {(ci.is_equipped || ci.is_attuned || ci.notes) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {ci.is_equipped && <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Экипировано</span>}
                    {ci.is_attuned && <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]"><span className="sheet-chip__dot" />Настроено</span>}
                    {ci.notes && <span className="text-xs text-stone-500">Заметка: {ci.notes}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pickerOpen && (
        <ItemPickerModal catalog={catalog} onPick={addItem} onClose={() => setPickerOpen(false)} />
      )}

      {editTarget && (
        <ItemEditModal
          title={`Изменить: ${itemById.get(Number(editTarget.item_id))?.name ?? `Предмет #${editTarget.item_id}`}`}
          value={editTarget}
          catalogItem={itemById.get(Number(editTarget.item_id))}
          onSave={(form) => saveEdit(editTarget, form)}
          onClose={() => setEditTarget(null)}
        />
      )}

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
  { id: 'level', label: 'Уровень', icon: '↑', hint: 'Повышение уровня и потолок' },
  { id: 'hp', label: 'Хиты', icon: '♥', hint: 'Хиты, временные хиты и отдых' },
  { id: 'stats', label: 'Характеристики', icon: '✦', hint: 'Базовые значения и ASI-коррекции' },
  { id: 'skills', label: 'Навыки', icon: '✔', hint: 'Экспертизы навыков' },
  { id: 'feats', label: 'Черты', icon: '★', hint: 'Выданные черты и умения' },
  { id: 'items', label: 'Снаряжение', icon: '⛁', hint: 'Инвентарь, экипировка и деньги' },
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

  const activeMeta = SECTIONS.find((s) => s.id === active)

  return (
    <div className="space-y-4">
      <div className="sheet-tabs" role="tablist" aria-label="Что редактируем">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === s.id}
            onClick={() => setActive(s.id)}
            className={`sheet-tabs__btn ${active === s.id ? 'sheet-tabs__btn_active' : ''}`}
          >
            <span aria-hidden className="mr-1.5">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
      {activeMeta && (
        <p className="-mt-2 text-xs text-stone-500">{activeMeta.hint}</p>
      )}
      {renderSection()}
    </div>
  )
}
