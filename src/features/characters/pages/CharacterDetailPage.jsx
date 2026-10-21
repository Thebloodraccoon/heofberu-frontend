import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { charactersApi as api } from '@/features/characters/api.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { fmtBonus } from '@/lib/utils/sheet.js'
import { useCharacter, useCanLevelUp, useCharacterPendingChoicesCount, useCharacterProficiencies } from '@/features/characters/queries.js'
import {
  useBackgroundDetail,
  useClassDetail,
  useRaceDetail,
  useSkills,
  useSubclassDetail,
  useSubraceDetail,
} from '@/features/catalog/queries.js'
import { armorProficiencyLabels, sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { useItemNames } from '@/features/catalog/queries.js'
import { ownedProficiencyItems } from '@/features/characters/components/sheet/ownedProficiencies.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { ErrorBox, Skeleton } from '@/components/ui'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { SheetTabs } from '@/components/sheet/primitives.jsx'
import SheetRollToasts from '@/components/sheet/SheetRollToasts.jsx'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'
import AbilitiesPanel from '@/features/characters/components/sheet/AbilitiesPanel.jsx'
import AttacksPanel from '@/features/characters/components/sheet/AttacksPanel.jsx'
import QuickStatsPanel from '@/features/characters/components/sheet/QuickStatsPanel.jsx'
import AbilityScores from '@/features/characters/components/sheet/AbilityScores.jsx'
import FeaturesPanel from '@/features/characters/components/sheet/FeaturesPanel.jsx'
import EquipmentPanel from '@/features/characters/components/sheet/EquipmentPanel.jsx'
import ConditionsPanel from '@/features/characters/components/sheet/ConditionsPanel.jsx'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'
import BackstoryPanel from '@/features/characters/components/sheet/BackstoryPanel.jsx'
import NotesPanel from '@/features/characters/components/sheet/NotesPanel.jsx'
import SpellsPanel from '@/features/characters/components/sheet/SpellsPanel.jsx'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import ProficiencyTable from '@/features/characters/components/sheet/ProficiencyTable.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'
import ArmorModal from '@/features/characters/components/sheet/ArmorModal.jsx'
import InspirationModal from '@/features/characters/components/sheet/InspirationModal.jsx'
import LevelUpModal from '@/features/characters/components/sheet/LevelUpModal.jsx'
import PendingChoicesModal from '@/features/characters/components/sheet/PendingChoicesModal.jsx'
import AnsweredChoicesSection from '@/features/characters/components/sheet/AnsweredChoicesSection.jsx'
import CharacterSettingsModal from '@/features/characters/components/sheet/CharacterSettingsModal.jsx'
import { num } from '@/features/characters/components/sheet/constants.js'

export default function CharacterDetailPage() {
  const { id } = useParams()
  const { data: character, error, refetch } = useCharacter(id)
  const [mutationError, setMutationError] = useState(null)

  // Identity names resolve via get-by-id of exactly what the character
  // references — no bulk catalog fetches on sheet load.
  const { data: classDetail } = useClassDetail(character?.class_id)
  const { data: subclassDetail } = useSubclassDetail(character?.class_id, character?.subclass_id)
  const { data: raceDetail } = useRaceDetail(character?.race_id)
  const { data: subraceDetail } = useSubraceDetail(character?.race_id, character?.subrace_id)
  const { data: backgroundDetail } = useBackgroundDetail(character?.background_id)
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const { data: proficienciesData } = useCharacterProficiencies(id)

  const [tab, setTab] = useState('attacks')
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const restoreMainTab = () => {
      if (desktop.matches) setTab((current) => current === 'abilities' ? 'attacks' : current)
    }
    desktop.addEventListener('change', restoreMainTab)
    return () => desktop.removeEventListener('change', restoreMainTab)
  }, [])
  const [rollToasts, setRollToasts] = useState([])
  const [hpModal, setHpModal] = useState(false)
  const [armorModal, setArmorModal] = useState(false)
  const [inspirationModal, setInspirationModal] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const { data: canLevelUpData } = useCanLevelUp(id)
  const [choicesOpen, setChoicesOpen] = useState(false)
  const { data: pendingChoicesCount = 0 } = useCharacterPendingChoicesCount(id)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await refetch()
    setMutationError(res?.error ?? null)
  }, [refetch])

  const saveField = useCallback(
    (field) => async (value) => {
      try {
        await api.update(id, { [field]: value })
        await load()
      } catch (e) {
        setMutationError(e)
      }
    },
    [id, load]
  )

  const pushToast = useCallback((title, die, bonus, total, diceSides = 20) => {
    const toastId = Date.now() + Math.random()
    const dieResult = diceSides === 20 ? { d20: die } : { rolls: [die] }
    const modifier = bonus ? ` ${Number(bonus) < 0 ? '−' : '+'} ${Math.abs(Number(bonus))}` : ''
    setRollToasts((prev) => [...prev.slice(-3), { id: toastId, title, ...dieResult, bonus, total }])
    recordRoll({ id: toastId, title, ...dieResult, detail: `${die}${modifier}`, dice: `к${diceSides}${modifier}`, total, at: Date.now() })
  }, [])

  const rollDice = useCallback(
    (title, bonus) => {
      const d20 = 1 + Math.floor(Math.random() * 20)
      pushToast(title, d20, bonus, d20 + Number(bonus ?? 0))
    },
    [pushToast]
  )

  const rollFree = useCallback(
    (counts) => {
      const entries = Object.entries(counts).filter(([, q]) => q > 0)
      if (entries.length === 0) return
      const rolls = []
      let total = 0
      for (const [sides, qty] of entries) {
        for (let i = 0; i < Number(qty); i += 1) {
          const v = 1 + Math.floor(Math.random() * Number(sides))
          rolls.push(v)
          total += v
        }
      }
      const idv = Date.now() + Math.random()
      const title = entries.map(([s, q]) => `${q}к${s}`).join(' + ')
      setRollToasts((prev) => [...prev.slice(-3), { id: idv, title, rolls, total }])
      recordRoll({ id: idv, title, detail: rolls.join(' + '), dice: title, total, at: Date.now() })
    },
    []
  )

  const rollDamage = useCallback((title, diceCount, diceSides, bonus) => {
    const count = Math.max(0, Number(diceCount) || 0)
    const sides = Number(diceSides) || 6
    const rolls = []
    let total = 0
    for (let i = 0; i < count; i += 1) {
      const v = 1 + Math.floor(Math.random() * sides)
      rolls.push(v)
      total += v
    }
    const bonusNum = Number(bonus) || 0
    total += bonusNum
    const idv = Date.now() + Math.random()
    const detail = rolls.length
      ? bonusNum
        ? `${rolls.join(' + ')} ${fmtBonus(bonusNum)}`
        : rolls.join(' + ')
      : fmtBonus(bonusNum)
    setRollToasts((prev) => [...prev.slice(-3), { id: idv, title, rolls, bonus: bonusNum, total }])
    recordRoll({ id: idv, title, detail, dice: `${count}к${sides}${bonusNum ? ` ${bonusNum < 0 ? '−' : '+'} ${Math.abs(bonusNum)}` : ''}`, total, at: Date.now() })
  }, [])

  const dismissToast = useCallback((toastId) => {
    setRollToasts((prev) => prev.filter((t) => t.id !== toastId))
  }, [])

  const level = Number(character?.level) || 1
  const pb = 2 + Math.floor((level - 1) / 4)

  const totals = useMemo(() => {
    const abilityTotals = character?.ability_scores || {}
    return Object.fromEntries(
      STATS.map((s) => [s.code, abilityTotals[`${s.key}_total`] ?? character?.[s.key] ?? 10])
    )
  }, [character])

  const modFor = useCallback((code) => mod(totals[code] ?? 10), [totals])

  const { profSet, expertiseSet } = useMemo(() => {
    const profs = new Set()
    const experts = new Set()
    for (const p of proficienciesData?.skills ?? []) {
      const sid = Number(p.skill_id)
      if (Number.isNaN(sid)) continue
      profs.add(sid)
      if (p.is_expertise) experts.add(sid)
    }
    return { profSet: profs, expertiseSet: experts }
  }, [proficienciesData?.skills])

  const saveSet = useMemo(
    () => new Set((proficienciesData?.saving_throws ?? []).map((s) => s.ability)),
    [proficienciesData?.saving_throws]
  )

  const sortedSkills = useMemo(() => [...skillsCatalog].sort((a, b) =>
    (skillLabels[a.name] ?? sentenceCase(a.name)).localeCompare(skillLabels[b.name] ?? sentenceCase(b.name), 'ru'),
  ), [skillsCatalog])

  // Владения доспехами/оружием: категории и конкретные предметы (item_id) —
  // имена предметов подтягиваются из справочника.
  const profItemNames = useItemNames(
    [...(proficienciesData?.armor ?? []), ...(proficienciesData?.weapons ?? [])].map((p) => p.item_id),
  )
  const armorProfs = useMemo(
    () =>
      ownedProficiencyItems(proficienciesData?.armor ?? classDetail?.armor_proficiencies ?? [], {
        categoryKey: 'armor_type',
        categoryLabels: armorProficiencyLabels,
        itemNames: profItemNames,
        itemFallback: 'доспех',
      }),
    [proficienciesData?.armor, classDetail, profItemNames],
  )
  const weaponProfs = useMemo(
    () =>
      ownedProficiencyItems(
        (proficienciesData?.weapons ?? classDetail?.weapon_proficiencies ?? []).map((w) =>
          typeof w === 'string' ? w : { ...w, weapon_category: w.weapon_category ?? w.weapon_type },
        ),
        { categoryKey: 'weapon_category', categoryLabels: weaponProficiencyLabels, itemNames: profItemNames, itemFallback: 'оружие' },
      ),
    [proficienciesData?.weapons, classDetail, profItemNames],
  )

  // Чужой лист (персонаж не в кампании этого ГМ) — понятный русский текст вместо ответа бэка.
  if (error || mutationError) return <ErrorBox error={toCampaignError(error ?? mutationError, { onlyKnown: true })} onRetry={load} />
  if (!character) {
    return (
      <div className="character-sheet" aria-busy="true" aria-label="Загрузка листа персонажа">
        <div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-72 max-w-full" /><Skeleton className="h-4 w-56" /></div>
        <div className="character-stats">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}</div>
        <div className="character-sheet-body">
          <div className="character-sheet-sidebar"><Skeleton className="h-96 rounded-lg" /></div>
          <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-36 rounded-lg" /><Skeleton className="h-36 rounded-lg" /></div>
        </div>
      </div>
    )
  }

  const identityFields = [
    { label: 'Имя', value: character.name || 'Безымянный персонаж' },
    { label: 'Уровень', value: String(level) },
    { label: 'Класс', value: classDetail?.name && sentenceCase(classDetail.name) },
    { label: 'Подкласс', value: subclassDetail?.name && sentenceCase(subclassDetail.name) },
    { label: 'Раса', value: raceDetail?.name && sentenceCase(raceDetail.name) },
    { label: 'Подраса', value: subraceDetail?.name && sentenceCase(subraceDetail.name) },
    { label: 'Предыстория', value: backgroundDetail?.name && sentenceCase(backgroundDetail.name) },
  ]

  const initiativeBonus = modFor('DEX') + (num(character.initiative_bonus) ?? 0)
  const initiativeKey = `heofberu:initiative:${id}`

  const rollInitiative = () => {
    const d20 = 1 + Math.floor(Math.random() * 20)
    try {
      window.localStorage.setItem(initiativeKey, String(d20 + initiativeBonus))
    } catch {
      /* localStorage недоступен */
    }
    pushToast('Инициатива', d20, initiativeBonus, d20 + initiativeBonus)
  }

  const saveBonus = (code) => modFor(code) + (saveSet.has(code) ? pb : 0)
  const skillBonus = (sk) => {
    const sid = Number(sk.id)
    const prof = profSet.has(sid)
    const expertise = expertiseSet.has(sid)
    return modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
  }

  const attackBonus = (a) => modFor(a.ability) + (a.is_proficient ? pb : 0) + (num(a.bonus_attack) ?? 0)

  const hpDelta = async (delta) => {
    try {
      await api.hp(id, { delta })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const setTempHp = async (temp_hp) => {
    try {
      await api.hp(id, { temp_hp })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const doRest = async (type) => {
    try {
      await api.rest(id, { type })
      await load()
      setHpModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const saveArmor = async ({ armor_class, shield }) => {
    try {
      await api.update(id, { armor_class, shield })
      await load()
      setArmorModal(false)
    } catch (e) {
      setMutationError(e)
    }
  }

  const tabs = [
    ['abilities', 'Характеристики', 'lg:hidden'],
    ['attacks', 'Атаки'],
    ['spells', 'Заклинания'],
    ['features', 'Способности'],
    ['equipment', 'Снаряжение'],
    ['conditions', 'Состояния'],
    ['personality', 'Личность'],
    ['notes', 'Заметки'],
    ['calculator', 'Развитие персонажа'],
  ]

  const renderStats = (fields, className) => (
    <QuickStatsPanel
      fields={fields}
      className={className}
      character={character}
      pb={pb}
      inspiration={Number(character?.inspiration) || 0}
      onOpenInspiration={() => setInspirationModal(true)}
      onOpenHp={() => setHpModal(true)}
      onOpenAc={() => setArmorModal(true)}
      initiativeBonus={initiativeBonus}
      onRollInitiative={rollInitiative}
    />
  )

  const renderAbilities = () => (
    <AbilitiesPanel
      topStats={renderStats(['hp', 'pb'], 'character-stats--top')}
      secondaryStats={renderStats(['ac', 'initiative', 'speed', 'inspiration'], 'character-stats--secondary')}
      skills={sortedSkills} saveBonus={saveBonus} saveSet={saveSet}
      skillBonus={skillBonus} profSet={profSet} expertiseSet={expertiseSet} onRoll={rollDice}
      armorProfs={armorProfs} weaponProfs={weaponProfs}
    />
  )

  return (
    <div className="character-sheet">
      <SheetHeader
        character={character}
        fields={identityFields}
        levelUpInfo={canLevelUpData}
        onOpenLevelUp={() => setLevelUpOpen(true)}
        pendingChoicesCount={pendingChoicesCount}
        onOpenChoices={() => setChoicesOpen(true)}
        onRollFree={rollFree}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="character-sheet-body">
        <aside className="character-sheet-sidebar" aria-label="Спасброски и навыки">
          {renderAbilities()}
        </aside>
        <section className="character-sheet-workspace">
          <AbilityScores totals={totals} onRoll={rollDice} />
          <SheetTabs tabs={tabs} active={tab} onSelect={setTab} />

          <div key={tab} className="character-sheet-content" role="region" aria-label={tabs.find(([key]) => key === tab)?.[1]}>
            {tab === 'abilities' && (
              <div className="character-mobile-abilities">
                {renderAbilities()}
              </div>
            )}
            {tab === 'calculator' && (
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <StatsCalculator characterId={character.id} />
                  <PlayerChoices characterId={character.id} />
                </div>
                <ProficiencyTable characterId={character.id} />
                <AnsweredChoicesSection characterId={character.id} />
              </div>
            )}
            {tab === 'attacks' && (
              <AttacksPanel
                characterId={character.id}
                attackBonus={attackBonus}
                onRoll={rollDice}
                onRollDamage={rollDamage}
                onError={setMutationError}
                classSpellcastingAbility={classDetail?.spellcasting_ability}
              />
            )}
            {tab === 'features' && (
              <FeaturesPanel character={character} onError={setMutationError} />
            )}
            {tab === 'equipment' && (
              <EquipmentPanel character={character} onError={setMutationError} />
            )}
            {tab === 'conditions' && (
              <ConditionsPanel character={character} onError={setMutationError} />
            )}
            {tab === 'personality' && (
              <div className="space-y-4">
                <PersonalityPanel character={character} onSave={saveField} />
                <BackstoryPanel characterId={id} onError={setMutationError} />
              </div>
            )}
            {tab === 'notes' && (
              <NotesPanel character={character} onSave={saveField} />
            )}
            {tab === 'spells' && (
              <SpellsPanel
                character={character}
                classSpellcastingAbility={classDetail?.spellcasting_ability}
                onError={setMutationError}
              />
            )}
          </div>
        </section>
      </div>

      {hpModal && (
        <HpModal
          character={character}
          onClose={() => setHpModal(false)}
          onDelta={hpDelta}
          onTempHp={setTempHp}
          onRest={doRest}
        />
      )}

      {armorModal && (
        <ArmorModal character={character} onClose={() => setArmorModal(false)} onSave={saveArmor} />
      )}

      {inspirationModal && (
        <InspirationModal
          character={character}
          onClose={() => setInspirationModal(false)}
          onError={setMutationError}
        />
      )}

      {levelUpOpen && (
        <LevelUpModal
          character={character}
          onClose={() => setLevelUpOpen(false)}
          onError={setMutationError}
          onRollToast={pushToast}
        />
      )}

      {choicesOpen && (
        <PendingChoicesModal
          character={character}
          onClose={() => setChoicesOpen(false)}
          onError={setMutationError}
        />
      )}

      {settingsOpen && (
        <CharacterSettingsModal
          character={character}
          onClose={() => setSettingsOpen(false)}
          onError={setMutationError}
        />
      )}

      <SheetRollToasts toasts={rollToasts} onDismiss={dismissToast} />
    </div>
  )
}
