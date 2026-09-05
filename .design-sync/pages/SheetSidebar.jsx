// Design-sync reference composition — the character sheet's ability-score
// sidebar, exposed as its own standalone piece (it's also embedded inside
// CharacterSheetPage.jsx, but on desktop it's a persistent independent
// <aside> next to the tabbed panel — see .design-sync/conventions.md's
// "Responsive layout" section). Real sub-components, mock derived data.
import { useMemo } from 'react'
import { STATS, mod } from '@/lib/utils/ability.js'
import { sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { PassiveSenses, ProficiencyList, SheetSectionLabel } from '@/components/sheet/primitives.jsx'
import AbilityBlock from '@/features/characters/components/sheet/AbilityBlock.jsx'
import { ARMOR_OPTIONS } from '@/features/characters/components/sheet/constants.js'

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

const DEFAULT_ABILITY_SCORES = {
  strength_total: 18, dexterity_total: 12, constitution_total: 16,
  intelligence_total: 14, wisdom_total: 12, charisma_total: 8,
}
const DEFAULT_SKILL_PROFICIENCIES = [
  { skill_id: 1, is_expertise: false },
  { skill_id: 6, is_expertise: false },
  { skill_id: 13, is_expertise: true },
  { skill_id: 16, is_expertise: false },
]
const DEFAULT_SAVE_PROFICIENCIES = [{ ability: 'STR' }, { ability: 'CON' }]
const CLASS_DETAIL = { armor_proficiencies: ['LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD'], weapon_proficiencies: ['SIMPLE', 'MARTIAL'] }

/**
 * The character sheet's ability-score panel: six AbilityBlock cards, passive
 * senses, and armor/weapon proficiency lists. On desktop (`lg:` and up) this
 * renders as a persistent left-hand <aside> next to the sheet's tabbed panel
 * — never hidden or collapsible; below `lg:` the same content becomes the
 * sheet's own "Характеристики" tab instead. Pass `level`/`abilityScores` to
 * reference a different character; everything else is realistic sample data.
 */
export function SheetSidebar({ level = 5, abilityScores = DEFAULT_ABILITY_SCORES }) {
  const pb = 2 + Math.floor((Number(level) - 1) / 4)

  const totals = useMemo(
    () => Object.fromEntries(STATS.map((s) => [s.code, abilityScores[`${s.key}_total`] ?? 10])),
    [abilityScores],
  )
  const modFor = (code) => mod(totals[code] ?? 10)

  const skillMap = useMemo(() => {
    const m = new Map()
    for (const sk of SKILLS_CATALOG) m.set(Number(sk.id), sk)
    return m
  }, [])

  const { profSet, expertiseSet } = useMemo(() => {
    const profs = new Set()
    const experts = new Set()
    for (const p of DEFAULT_SKILL_PROFICIENCIES) {
      profs.add(Number(p.skill_id))
      if (p.is_expertise) experts.add(Number(p.skill_id))
    }
    return { profSet: profs, expertiseSet: experts }
  }, [])

  const saveSet = useMemo(() => new Set(DEFAULT_SAVE_PROFICIENCIES.map((s) => s.ability)), [])

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

  const saveBonus = (code) => modFor(code) + (saveSet.has(code) ? pb : 0)
  const skillBonus = (sk) => {
    const sid = Number(sk.id)
    const prof = profSet.has(sid)
    const expertise = expertiseSet.has(sid)
    return modFor(sk.ability) + (prof ? pb : 0) + (expertise ? pb : 0)
  }

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
    onRoll: () => {},
  })
  const [str, dex, con, int, wis, cha] = STATS

  return (
    <aside className="sheet-left fantasy-panel rounded-lg p-4">
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
        <ProficiencyList items={CLASS_DETAIL.armor_proficiencies} options={ARMOR_OPTIONS} empty="Не задано классом" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <SheetSectionLabel>Владение оружием</SheetSectionLabel>
        <ProficiencyList
          items={CLASS_DETAIL.weapon_proficiencies}
          options={Object.entries(weaponProficiencyLabels).map(([value, label]) => ({ value, label }))}
          empty="Не задано классом"
        />
      </div>
    </aside>
  )
}
