// Design-sync reference composition — NOT the real app page (that's
// src/features/characters/pages/CharacterDetailPage.jsx, which fetches via
// useParams+useCharacter and can't render outside a live backend). This file
// reproduces its layout/derived-value logic with the SAME real sub-components,
// backed by local mock state instead of a network fetch, so Claude Design has
// a faithful reference for "the character page". See .design-sync/NOTES.md.
import { useMemo, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/features/auth/AuthContext.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { recordRoll } from '@/lib/rollHistory.js'
import { fmtBonus } from '@/lib/utils/sheet.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { PassiveSenses, ProficiencyList, SheetSectionLabel, SheetTabs } from '@/components/sheet/primitives.jsx'
import SheetRollToasts from '@/components/sheet/SheetRollToasts.jsx'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'
import AbilityBlock from '@/features/characters/components/sheet/AbilityBlock.jsx'
import AttacksPanel from '@/features/characters/components/sheet/AttacksPanel.jsx'
import FeaturesPanel from '@/features/characters/components/sheet/FeaturesPanel.jsx'
import EquipmentPanel from '@/features/characters/components/sheet/EquipmentPanel.jsx'
import ConditionsPanel from '@/features/characters/components/sheet/ConditionsPanel.jsx'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'
import BackstoryPanel from '@/features/characters/components/sheet/BackstoryPanel.jsx'
import NotesPanel from '@/features/characters/components/sheet/NotesPanel.jsx'
import SpellsPanel from '@/features/characters/components/sheet/SpellsPanel.jsx'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import PlayerChoices from '@/features/characters/components/sheet/PlayerChoices.jsx'
import { ARMOR_OPTIONS, num } from '@/features/characters/components/sheet/constants.js'

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const FaceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15h8" /><path d="M8 9h2" /><path d="M14 9h2" />
  </svg>
)
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />
  </svg>
)

// ---- mock reference data (a level-5 mountain-dwarf Eldritch Knight) ----

const SKILLS_CATALOG = [
  { id: 1, name: 'athletics', ability: 'STR' },
  { id: 2, name: 'acrobatics', ability: 'DEX' },
  { id: 3, name: 'sleight_of_hand', ability: 'DEX' },
  { id: 4, name: 'stealth', ability: 'DEX' },
  { id: 5, name: 'arcana', ability: 'INT' },
  { id: 6, name: 'history', ability: 'INT' },
  { id: 7, name: 'investigation', ability: 'INT' },
  { id: 8, name: 'nature', ability: 'INT' },
  { id: 9, name: 'religion', ability: 'INT' },
  { id: 10, name: 'animal_handling', ability: 'WIS' },
  { id: 11, name: 'insight', ability: 'WIS' },
  { id: 12, name: 'medicine', ability: 'WIS' },
  { id: 13, name: 'perception', ability: 'WIS' },
  { id: 14, name: 'survival', ability: 'WIS' },
  { id: 15, name: 'deception', ability: 'CHA' },
  { id: 16, name: 'intimidation', ability: 'CHA' },
  { id: 17, name: 'performance', ability: 'CHA' },
  { id: 18, name: 'persuasion', ability: 'CHA' },
]

const makeMockCharacter = () => ({
  id: 1,
  name: 'Тордек Крепкорукий',
  level: 5,
  class_id: 3,
  subclass_id: 31,
  race_id: 2,
  subrace_id: 21,
  background_id: 5,
  ability_scores: {
    strength_total: 18, dexterity_total: 12, constitution_total: 16,
    intelligence_total: 14, wisdom_total: 12, charisma_total: 8,
  },
  conditions: [{ condition: 'POISONED', source: 'Яд гоблина' }],
  inspiration: true,
  initiative_bonus: 0,
  skill_proficiencies: [
    { skill_id: 1, is_expertise: false },
    { skill_id: 6, is_expertise: false },
    { skill_id: 13, is_expertise: true },
    { skill_id: 16, is_expertise: false },
  ],
  saving_throw_proficiencies: [{ ability: 'STR' }, { ability: 'CON' }],
  current_hp: 32, max_hp: 47, temp_hp: 5,
  armor_class: 16, shield: 2, speed: 30,
  money_gold: 120, money_silver: 45, money_copper: 8,
  notes: 'Проверить торговца оружием в следующем городе — обещал редкий клинок.',
  personality_traits: 'Никогда не отступаю первым — даже когда стоило бы.',
  ideals: 'Долг. Клятва, данная своим, важнее собственной жизни.',
  bonds: 'Мой боевой топор передавался в клане пять поколений.',
  flaws: 'Не доверяю магии — и магам, пока не докажут обратное.',
})

const CLASS_DETAIL = { name: 'Воин', armor_proficiencies: ['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD'], weapon_proficiencies: ['SIMPLE', 'MARTIAL'], spellcasting_ability: 'INT' }
const SUBCLASS_DETAIL = { name: 'Мистический рыцарь' }
const RACE_DETAIL = { name: 'Дворф' }
const SUBRACE_DETAIL = { name: 'Дворф-горец' }
const BACKGROUND_DETAIL = { name: 'Солдат' }

const ATTACKS = [
  { id: 1, name: 'Боевой топор', ability: 'STR', is_proficient: true, bonus_attack: 0, damage_dice_count: 1, damage_dice_type: 'D8', bonus_damage: 0, damage_type: 'SLASHING', notes: 'Можно держать двумя руками (1к10).', range: null },
  { id: 2, name: 'Ручной топор (метательный)', ability: 'STR', is_proficient: true, bonus_attack: 0, damage_dice_count: 1, damage_dice_type: 'D6', bonus_damage: 0, damage_type: 'SLASHING', notes: '', range: '6/18 м' },
  { id: 3, name: 'Тяжёлый арбалет', ability: 'DEX', is_proficient: true, bonus_attack: 0, damage_dice_count: 1, damage_dice_type: 'D10', bonus_damage: 0, damage_type: 'PIERCING', notes: '', range: '30/120 м' },
]

const FEATS = [
  { id: 1, feat_id: 10, feat: { name: 'Тяжеловес', description: 'Один раз в свой ход, промахнувшись рукопашной атакой, вы можете перебросить кубик атаки.' } },
]
const FEATURES = [
  { id: 2, feature_id: 20, feature: { name: 'Второе дыхание', description: 'Бонусным действием восстанавливаете 1к10 + уровень воина хитов. Раз за короткий или длинный отдых.', source_type: 'CLASS', level: 1 }, notes: null },
  { id: 3, feature_id: 21, feature: { name: 'Стойкость дворфов', description: 'Преимущество на спасброски против яда, и сопротивление к урону ядом.', source_type: 'RACE', level: null }, notes: null },
  { id: 4, feature_id: 22, feature: { name: 'Боевой стиль: Защита', description: 'Пока вы носите доспех, ваш КД увеличивается на 1.', source_type: 'CLASS', level: 1 }, notes: null },
  { id: 5, feature_id: 23, feature: { name: 'Дополнительная атака', description: 'Вы можете атаковать дважды, вместо одного раза, каждый раз совершая действие Атака в свой ход.', source_type: 'CLASS', level: 5 }, notes: null },
  { id: 6, feature_id: 24, feature: { name: 'Заклинания мистического рыцаря', description: 'Вы изучаете заклинания волшебника, в основном школы ограждения и воплощения.', source_type: 'SUBCLASS', level: 3 }, notes: null },
]

const ITEMS = [
  { id: 1, item_id: 1, quantity: 1, is_equipped: true, is_attuned: false, notes: '', item: { name: 'Кольчуга', description: 'Тяжёлый доспех из переплетённых металлических колец.', rarity: 'NONE', requires_attunement: false, weight: 55, cost_gold: 75, armor_class_base: 16, armor_class_dex_bonus: false, armor_class_max_dex_bonus: null, weapon_properties: '' } },
  { id: 2, item_id: 2, quantity: 1, is_equipped: true, is_attuned: false, notes: '', item: { name: 'Боевой топор', description: 'Простое рубящее оружие клана Крепкоруких.', rarity: 'NONE', requires_attunement: false, weight: 4, cost_gold: 10, damage_dice_count: 1, damage_dice_type: 'D8', damage_type: 'SLASHING', weapon_properties: 'VERSATILE' } },
  { id: 3, item_id: 3, quantity: 1, is_equipped: false, is_attuned: true, notes: 'Подарок отца перед уходом из клана', item: { name: 'Амулет здоровья +1', description: 'Тускло светится в темноте тёплым золотым светом.', rarity: 'UNCOMMON', requires_attunement: true, weight: 0.5, cost_gold: 500 } },
  { id: 4, item_id: 4, quantity: 3, is_equipped: false, is_attuned: false, notes: '', item: { name: 'Зелье лечения', description: 'Восстанавливает 2к4+2 хитов при употреблении.', rarity: 'COMMON', requires_attunement: false, weight: 0.5, cost_gold: 50 } },
]

const SPELLS = [
  { spell_id: 1, spell: { name: 'Огненный снаряд', school: 'EVOCATION', level: 'CANTRIP', cast_time: 'ACTION', range_value: 36, duration: 'INSTANTANEOUS', is_concentration: false, components: ['VERBAL', 'SOMATIC'], damage_dice_count: 1, damage_dice_type: 'D10', damage_type: 'FIRE', description: 'Швыряете в цель огненный шар, наносящий урон огнём.' } },
  { spell_id: 2, spell: { name: 'Щит', school: 'ABJURATION', level: 'LEVEL_1', cast_time: 'REACTION', range_type: 'SELF', duration: 'ROUND_1', is_concentration: false, components: ['VERBAL', 'SOMATIC'], description: 'Невидимый барьер даёт +5 к КД до начала следующего хода.' } },
  { spell_id: 3, spell: { name: 'Обнаружение магии', school: 'DIVINATION', level: 'LEVEL_1', cast_time: 'ACTION', range_type: 'SELF', duration: 'MINUTE_10', is_concentration: true, components: ['VERBAL', 'SOMATIC'], description: 'Ощущаете присутствие магии в радиусе 9 метров.' } },
]
const SPELL_SLOTS = [{ spell_level: 'CANTRIP', total: 2 }, { spell_level: 'LEVEL_1', total: 2 }]

const STATS_DATA = {
  strength: { base: 16, total: 18, contributions: [{ source: 'RACE', amount: 2 }] },
  dexterity: { base: 12, total: 12, contributions: [] },
  constitution: { base: 14, total: 16, contributions: [{ source: 'RACE', amount: 2 }] },
  intelligence: { base: 14, total: 14, contributions: [] },
  wisdom: { base: 12, total: 12, contributions: [] },
  charisma: { base: 8, total: 8, contributions: [] },
}

const ASI_CHOICES = [
  { class_level: 4, increases: [{ ability: 'STR', amount: 2 }] },
  { class_level: 8, choice_type: 'FEAT', feat_id: 10, feat: { name: 'Тяжеловес' } },
]
const FEATS_CATALOG = [{ id: 10, name: 'Тяжеловес' }]

const BACKSTORY = 'Родился в горном клане на севере. Ушёл искать приключений после того, как драконы разорили родовые шахты — поклялся однажды вернуться и отвоевать их.'

const LEVEL_UP_INFO = { can_level_up: true, max_level: 20, current_level: 5 }

function seedQueryClient(qc, character) {
  const id = character.id
  qc.setQueryData(queryKeys.characters.attacks(id), ATTACKS)
  qc.setQueryData(queryKeys.characters.feats(id), FEATS)
  qc.setQueryData(queryKeys.characters.features(id), FEATURES)
  qc.setQueryData(queryKeys.characters.items(id), ITEMS)
  qc.setQueryData(queryKeys.characters.spells(id), { spells: SPELLS, spell_slots: SPELL_SLOTS })
  qc.setQueryData(queryKeys.characters.stats(id), STATS_DATA)
  qc.setQueryData(queryKeys.characters.asiChoices(id), ASI_CHOICES)
  qc.setQueryData(['characters', id, 'backstory'], { content: BACKSTORY })
  qc.setQueryData(queryKeys.catalog.feats({ size: 100 }), FEATS_CATALOG)
}

const AUTH_VALUE = { user: { username: 'Игрок' } }

const TABS = [
  ['abilities', 'Характеристики', 'lg:hidden'],
  ['attacks', 'Атаки'],
  ['features', 'Способности'],
  ['equipment', 'Снаряжение'],
  ['conditions', 'Состояния'],
  ['personality', 'Личность'],
  ['backstory', 'Предыстория'],
  ['notes', 'Заметки'],
  ['spells', 'Заклинания'],
  ['calculator', 'Развитие персонажа'],
]

function CharacterSheet({ initialTab }) {
  const [character, setCharacter] = useState(makeMockCharacter)
  const [tab, setTab] = useState(initialTab)
  const [rollToasts, setRollToasts] = useState([])
  const [hpModal, setHpModal] = useState(false)
  const [armorModal, setArmorModal] = useState(false)

  const pushToast = (title, d20, bonus, total) => {
    const toastId = Date.now() + Math.random()
    setRollToasts((prev) => [...prev.slice(-3), { id: toastId, title, d20, bonus, total }])
    recordRoll({ id: toastId, title, detail: bonus ? `d20 ${fmtBonus(bonus)}` : 'd20', total, at: Date.now() })
  }
  const rollDice = (title, bonus) => {
    const d20 = 1 + Math.floor(Math.random() * 20)
    pushToast(title, d20, bonus, d20 + Number(bonus ?? 0))
  }
  const rollFree = (counts) => {
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
    recordRoll({ id: idv, title, detail: rolls.join(' + '), total, at: Date.now() })
  }
  const dismissToast = (toastId) => setRollToasts((prev) => prev.filter((t) => t.id !== toastId))

  // Local-only mutations: this reference composition has no backend, so
  // interactions update the mock character in place instead of calling the API.
  const toggleInspiration = () => setCharacter((c) => ({ ...c, inspiration: !c.inspiration }))
  const hpDelta = (delta) => {
    setCharacter((c) => ({ ...c, current_hp: Math.max(0, Math.min(c.max_hp, c.current_hp + delta)) }))
    setHpModal(false)
  }
  const setTempHp = (temp_hp) => {
    setCharacter((c) => ({ ...c, temp_hp }))
    setHpModal(false)
  }
  const doRest = (type) => {
    setCharacter((c) => ({ ...c, current_hp: type === 'LONG' ? c.max_hp : Math.min(c.max_hp, c.current_hp + Math.floor(c.max_hp / 2)) }))
    setHpModal(false)
  }
  const saveArmor = ({ armor_class, shield }) => {
    setCharacter((c) => ({ ...c, armor_class, shield }))
    setArmorModal(false)
  }
  const saveField = (field) => (value) => setCharacter((c) => ({ ...c, [field]: value }))
  const onPanelError = () => {
    /* reference composition has no backend — panel mutations fail quietly */
  }

  const level = Number(character.level) || 1
  const pb = 2 + Math.floor((level - 1) / 4)

  const totals = useMemo(() => {
    const abilityTotals = character.ability_scores || {}
    return Object.fromEntries(
      STATS.map((s) => [s.code, abilityTotals[`${s.key}_total`] ?? character[s.key] ?? 10]),
    )
  }, [character])
  const modFor = (code) => mod(totals[code] ?? 10)

  const skillMap = useMemo(() => {
    const m = new Map()
    for (const sk of SKILLS_CATALOG) m.set(Number(sk.id), sk)
    return m
  }, [])

  const { profSet, expertiseSet } = useMemo(() => {
    const profs = new Set()
    const experts = new Set()
    for (const p of character.skill_proficiencies ?? []) {
      const sid = Number(p.skill_id)
      if (Number.isNaN(sid)) continue
      profs.add(sid)
      if (p.is_expertise) experts.add(sid)
    }
    return { profSet: profs, expertiseSet: experts }
  }, [character.skill_proficiencies])

  const saveSet = useMemo(
    () => new Set((character.saving_throw_proficiencies ?? []).map((s) => s.ability)),
    [character.saving_throw_proficiencies],
  )

  const skillsByAbility = useMemo(() => {
    const groups = Object.fromEntries(STATS.map((s) => [s.code, []]))
    groups.other = []
    for (const sk of SKILLS_CATALOG) {
      const code = sk.ability && groups[sk.ability] ? sk.ability : 'other'
      groups[code].push(sk)
    }
    const displayName = (sk) => skillLabels[sk.name ?? ''] ?? sentenceCase(sk.name ?? '')
    for (const code of Object.keys(groups)) {
      groups[code].sort((a, b) => displayName(a).localeCompare(displayName(b), 'ru'))
    }
    return groups
  }, [])

  const passiveSenses = useMemo(() => {
    const findSkill = (key) => SKILLS_CATALOG.find((s) => s.name === key)
    const build = (key, icon) => {
      const sk = findSkill(key)
      if (!sk) return null
      const prof = profSet.has(Number(sk.id))
      const expertise = expertiseSet.has(Number(sk.id))
      const value = 10 + modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
      return { name: skillLabels[key] ?? sentenceCase(sk.name), value, icon }
    }
    return [build('perception', <EyeIcon />), build('insight', <FaceIcon />), build('investigation', <SearchIcon />)].filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profSet, expertiseSet, pb])

  const armorProfs = CLASS_DETAIL.armor_proficiencies
  const weaponProfs = CLASS_DETAIL.weapon_proficiencies

  const saveBonus = (code) => modFor(code) + (saveSet.has(code) ? pb : 0)
  const skillBonus = (sk) => {
    const sid = Number(sk.id)
    const prof = profSet.has(sid)
    const expertise = expertiseSet.has(sid)
    return modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
  }
  const attackBonus = (a) => modFor(a.ability) + (a.is_proficient ? pb : 0) + (num(a.bonus_attack) ?? 0)

  const identityFields = [
    { label: 'Имя', value: character.name || 'Безымянный персонаж' },
    { label: 'Уровень', value: String(level) },
    { label: 'Класс', value: CLASS_DETAIL.name },
    { label: 'Подкласс', value: SUBCLASS_DETAIL.name },
    { label: 'Раса', value: RACE_DETAIL.name },
    { label: 'Подраса', value: SUBRACE_DETAIL.name },
    { label: 'Предыстория', value: BACKGROUND_DETAIL.name },
  ]

  const renderAbilities = () => {
    const makeProps = (s) => ({
      stat: s,
      total: totals[s.code],
      saveBonus: saveBonus(s.code),
      saveProf: saveSet.has(s.code),
      skills: skillsByAbility[s.code],
      skillMap,
      skillBonus,
      skillChecked: (sk) => profSet.has(Number(sk.id)),
      skillExpertise: (sk) => expertiseSet.has(Number(sk.id)),
      onRoll: rollDice,
    })
    const [str, dex, con, int, wis, cha] = STATS
    return (
      <>
        <div className="sheet-ability-pair">
          <AbilityBlock {...makeProps(str)} />
          <AbilityBlock {...makeProps(con)} />
        </div>
        <AbilityBlock {...makeProps(wis)} />
        <AbilityBlock {...makeProps(int)} />
        <AbilityBlock {...makeProps(cha)} />
        <AbilityBlock {...makeProps(dex)} />
        {passiveSenses.length > 0 && (
          <div className="py-1">
            <SheetSectionLabel className="!mt-0">Пассивные чувства</SheetSectionLabel>
            <PassiveSenses items={passiveSenses} />
          </div>
        )}
        <div style={{ gridColumn: '1 / -1' }}>
          <SheetSectionLabel>Владение доспехами</SheetSectionLabel>
          <ProficiencyList items={armorProfs} options={ARMOR_OPTIONS} empty="Не задано классом" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <SheetSectionLabel>Владение оружием</SheetSectionLabel>
          <ProficiencyList
            items={weaponProfs}
            options={Object.entries(weaponProficiencyLabels).map(([value, label]) => ({ value, label }))}
            empty="Не задано классом"
          />
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SheetHeader
        character={character}
        fields={identityFields}
        level={level}
        pb={pb}
        inspiration={Boolean(character.inspiration)}
        onInspiration={toggleInspiration}
        onOpenHp={() => setHpModal(true)}
        onOpenAc={() => setArmorModal(true)}
        levelUpInfo={LEVEL_UP_INFO}
        onOpenLevelUp={() => {}}
        initiativeBonus={modFor('DEX')}
        initiativeLast={null}
        onRollInitiative={() => rollDice('Инициатива', modFor('DEX'))}
        onRollFree={rollFree}
        onOpenSettings={() => {}}
      />

      <div className="sheet-body">
        <div className="sheet-col-left">
          <aside className="sheet-left fantasy-panel rounded-lg p-4">{renderAbilities()}</aside>
        </div>

        <section className="sheet-right fantasy-panel rounded-lg p-4">
          <SheetTabs tabs={TABS} active={tab} onSelect={setTab} />

          <div className="pt-4">
            {tab === 'abilities' && (
              <div className="sheet-left sheet-abilities-tab">{renderAbilities()}</div>
            )}
            {tab === 'calculator' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <StatsCalculator characterId={character.id} />
                <PlayerChoices characterId={character.id} />
              </div>
            )}
            {tab === 'attacks' && (
              <AttacksPanel
                characterId={character.id}
                attackBonus={attackBonus}
                onRoll={rollDice}
                onError={onPanelError}
                classSpellcastingAbility={CLASS_DETAIL.spellcasting_ability}
              />
            )}
            {tab === 'features' && <FeaturesPanel character={character} onError={onPanelError} />}
            {tab === 'equipment' && <EquipmentPanel character={character} onError={onPanelError} />}
            {tab === 'conditions' && <ConditionsPanel character={character} onError={onPanelError} />}
            {tab === 'personality' && <PersonalityPanel character={character} onSave={saveField} />}
            {tab === 'backstory' && <BackstoryPanel characterId={character.id} onError={onPanelError} />}
            {tab === 'notes' && <NotesPanel character={character} onSave={saveField} />}
            {tab === 'spells' && (
              <SpellsPanel character={character} classSpellcastingAbility={CLASS_DETAIL.spellcasting_ability} onError={onPanelError} />
            )}
          </div>
        </section>
      </div>

      <SheetRollToasts toasts={rollToasts} onDismiss={dismissToast} />
    </div>
  )
}

/**
 * The character sheet page: header, ability-score sidebar, and the tabbed
 * detail panel (attacks, features, equipment, conditions, personality,
 * backstory, notes, spells, progression). Composed from the real sheet
 * components with a self-contained mock character — no backend required.
 */
export function CharacterSheetPage({ initialTab = 'attacks' }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc, { id: 1 })
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={AUTH_VALUE}>
        <MemoryRouter>
          <CharacterSheet initialTab={initialTab} />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}
