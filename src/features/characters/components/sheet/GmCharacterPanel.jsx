import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import {
  useCanLevelUp,
  useCharacterAsiAdjustments,
  useCharacterFeats,
  useCharacterGmStats,
  useCharacterItems,
  useCharacterMaxLevel,
} from '@/features/characters/queries.js'
import { useFeats, useFeatsFull, useItems, useSkills } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { ASI_LEVELS, abilityName } from '@/lib/utils/ability.js'
import { statsToTotals } from '@/lib/utils/characterCreate.js'
import { Button, EmptyState, Input, Select } from '@/components/ui'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'

function Section({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
      <p className="sheet-section-label !mt-0">{title}</p>
      {children}
    </div>
  )
}

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']

function MaxHpSection({ character, onError, reload }) {
  const [value, setValue] = useState(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await charactersApi.gmPanel.maxHp(character.id, { max_hp: Number(value) })
      setValue(null)
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Section title="Максимум ХП">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-200">{character.max_hp} HP</span>
        <Input
          type="number"
          min="0"
          className="!w-24"
          value={value ?? ''}
          placeholder="новое"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button size="sm" disabled={busy || value === null || value === ''} onClick={save}>
          Задать
        </Button>
      </div>
    </Section>
  )
}

function MaxLevelSection({ characterId, level, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: maxLevelData } = useCharacterMaxLevel(characterId)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const current = maxLevelData?.max_level ?? '—'

  const save = async () => {
    setBusy(true)
    try {
      await charactersApi.gmPanel.maxLevel.set(characterId, { max_level: Number(value) })
      setValue('')
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(characterId), 'gm-panel', 'max-level'] })
      await queryClient.invalidateQueries({ queryKey: ['characters', Number(characterId), 'progression', 'can-level-up'] })
      await reload()
    } catch (e) {
      onError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Максимальный уровень">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-200">
          сейчас: {current} (персонаж ур. {level})
        </span>
        <Input
          type="number"
          min="1"
          max="20"
          className="!w-20"
          value={value}
          placeholder="новый"
          onChange={(e) => setValue(e.target.value)}
        />
        <Button size="sm" disabled={busy || !value} onClick={save}>
          Поднять
        </Button>
      </div>
    </Section>
  )
}

function StatsSection({ characterId, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: stats } = useCharacterGmStats(characterId)
  const { data: adjustments = [] } = useCharacterAsiAdjustments(characterId)
  const [increases, setIncreases] = useState([])
  const [amounts, setAmounts] = useState({})
  const [busy, setBusy] = useState(false)

  const toggleAbility = (ability) =>
    setIncreases((prev) => (prev.includes(ability) ? prev.filter((a) => a !== ability) : [...prev, ability]))

  const addAdjustment = async () => {
    const payload = increases.map((ability) => ({ ability, amount: Number(amounts[ability] ?? 1) }))
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

  return (
    <Section title="Характеристики (база → итог)">
      {!stats && <p className="text-sm text-stone-500">Загрузка...</p>}
      {stats && (
        <ul className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {ABILITIES.map((key) => (
            <li key={key} className="flex justify-between text-stone-300">
              <span>{abilityName(key.toUpperCase())}</span>
              <span className="font-mono">
                {stats[key]?.base ?? '—'} → <span className="text-ember">{stats[key]?.total ?? '—'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {ABILITIES.map((ability) => (
          <button
            key={ability}
            type="button"
            onClick={() => toggleAbility(ability)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              increases.includes(ability)
                ? 'border-ember bg-ember/10 text-ember'
                : 'border-stone-700 text-stone-400 hover:border-stone-500'
            }`}
          >
            {abilityName(ability.toUpperCase())}
          </button>
        ))}
        {increases.map((ability) => (
          <label key={`amt-${ability}`} className="flex items-center gap-1 text-xs text-stone-400">
            ±
            <Input
              type="number"
              className="!w-16"
              value={amounts[ability] ?? ''}
              placeholder="0"
              onChange={(e) => setAmounts({ ...amounts, [ability]: e.target.value })}
            />
          </label>
        ))}
        <Button size="sm" disabled={busy || increases.length === 0} onClick={addAdjustment}>
          Применить ASI
        </Button>
      </div>
      {adjustments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {adjustments.map((adj) => (
            <li key={adj.id} className="flex items-center justify-between rounded border border-stone-800 px-2.5 py-1.5 text-xs text-stone-300">
              <span>
                {(adj.increases ?? [])
                  .map((inc) => `${abilityName(inc.ability)} ${inc.amount > 0 ? `+${inc.amount}` : inc.amount}`)
                  .join(', ') || 'без изменений'}
              </span>
              <button
                type="button"
                className="text-red-300 transition hover:text-red-200"
                onClick={() => removeAdjustment(adj.id)}
                title="Откатить"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function ExpertiseSection({ character, onError, reload }) {
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const proficiencies = character.skill_proficiencies ?? []
  const [busyId, setBusyId] = useState(null)

  const nameOf = (skillId) => skillsCatalog.find((s) => Number(s.id) === Number(skillId))?.name ?? `Навык #${skillId}`

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

  if (proficiencies.length === 0) return null

  return (
    <Section title="Экспертиза навыков">
      <ul className="grid gap-1 sm:grid-cols-2">
        {proficiencies.map((p) => (
          <li key={p.skill_id}>
            <label className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm ${busyId === p.skill_id ? 'opacity-50' : ''}`}>
              <input
                type="checkbox"
                checked={Boolean(p.is_expertise)}
                onChange={(e) => toggle(p.skill_id, e.target.checked)}
                className="size-4 accent-ember"
              />
              <span className="text-stone-200">{nameOf(p.skill_id)}</span>
            </label>
          </li>
        ))}
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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.characters.items(Number(character.id)) })

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

  const nameOf = (idv) => catalog.find((x) => Number(x.id) === Number(idv))?.name

  return (
    <Section title="Инвентарь (GM)">
      {items.length === 0 ? (
        <EmptyState text="Инвентарь пуст" />
      ) : (
        <ul className="mb-3 space-y-1.5">
          {items.map((ci) => (
            <li key={ci.id} className="rounded border border-stone-800 px-2.5 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-stone-100">
                  {nameOf(ci.item_id) || `Предмет #${ci.item_id}`}
                  {ci.quantity > 1 && <span className="ml-1 text-xs text-stone-400">×{ci.quantity}</span>}
                </span>
                <button
                  type="button"
                  className="shrink-0 text-red-300 transition hover:text-red-200"
                  onClick={() => removeItem(ci.id)}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-stone-400">
                <label className="flex items-center gap-1">
                  кол-во:
                  <Input
                    type="number"
                    min="0"
                    className="!w-16 !py-0.5"
                    defaultValue={ci.quantity}
                    onBlur={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0)
                      if (v !== ci.quantity) patchItem(ci.id, { quantity: v })
                    }}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={ci.is_equipped}
                    onChange={(e) => patchItem(ci.id, { is_equipped: e.target.checked })}
                    className="size-3.5 accent-ember"
                  />
                  экипировано
                </label>
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={ci.is_attuned}
                    onChange={(e) => patchItem(ci.id, { is_attuned: e.target.checked })}
                    className="size-3.5 accent-ember"
                  />
                  настроено
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="!w-auto min-w-36 flex-1">
          <option value="">Выберите предмет...</option>
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
    </Section>
  )
}

function LevelUpSection({ character, onError, reload }) {
  const queryClient = useQueryClient()
  const { data: canLevelUp } = useCanLevelUp(character.id)
  const featsQ = useFeatsFull()
  const [asiPromptLevel, setAsiPromptLevel] = useState(null)

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

  return (
    <Section title="Уровень">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-200">
          ур. {character.level}
          {canLevelUp ? ` · потолок ${canLevelUp.max_level}` : ''}
        </span>
        {canLevelUp?.can_level_up ? (
          <Button size="sm" onClick={onLevelUpClick}>
            Повысить до ур. {(Number(character.level) || 1) + 1}
          </Button>
        ) : (
          <span className="text-xs text-stone-500">Повышение недоступно — поднимите потолок уровня.</span>
        )}
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

export default function GmCharacterPanel({ character, onError, reload }) {
  const sections = useMemo(
    () => [
      <MaxHpSection key="hp" character={character} onError={onError} reload={reload} />,
      <MaxLevelSection key="level" characterId={character.id} level={character.level} onError={onError} reload={reload} />,
      <StatsSection key="stats" characterId={character.id} onError={onError} reload={reload} />,
      <ExpertiseSection key="expertise" character={character} onError={onError} reload={reload} />,
      <FeatsFeaturesSection key="feats" character={character} onError={onError} reload={reload} />,
      <ItemsSection key="items" character={character} onError={onError} reload={reload} />,
      <LevelUpSection key="levelup" character={character} onError={onError} reload={reload} />,
    ],
    [character, onError, reload],
  )

  return (
    <div className="space-y-4">
      <p className="-mt-1 text-xs text-stone-500">Панель редакции: правки применяются сразу и видны игроку.</p>
      {sections}
    </div>
  )
}
