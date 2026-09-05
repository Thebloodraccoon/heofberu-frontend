// Design-sync reference composition — the character sheet's own dialogs,
// each backed by the REAL modal component, a mock character, and a
// QueryClient seeded with whatever catalog/character sub-resource queries
// that dialog reads. Picked one at a time via a `which` prop. See
// .design-sync/NOTES.md.
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'
import ArmorModal from '@/features/characters/components/sheet/ArmorModal.jsx'
import MoneyModal from '@/features/characters/components/sheet/MoneyModal.jsx'
import LevelUpModal from '@/features/characters/components/sheet/LevelUpModal.jsx'
import CharacterSettingsModal from '@/features/characters/components/sheet/CharacterSettingsModal.jsx'
import AttackModal from '@/features/characters/components/sheet/AttackModal.jsx'
import SpellPickerModal from '@/features/characters/components/sheet/SpellPickerModal.jsx'
import SubracePickerModal from '@/features/characters/components/sheet/SubracePickerModal.jsx'
import SubclassPickerModal from '@/features/characters/components/sheet/SubclassPickerModal.jsx'
import BackgroundPickerModal from '@/features/characters/components/sheet/BackgroundPickerModal.jsx'
import AsiChoiceModal from '@/features/characters/components/wizard/AsiChoiceModal.jsx'

const MOCK_CHARACTER = {
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
  current_hp: 32, max_hp: 47, temp_hp: 5,
  armor_class: 16, shield: 2,
  money_gold: 120, money_silver: 45, money_copper: 8,
}

const CLASS_DETAIL = { name: 'Воин', hit_dice: 'D10' }
const BACKGROUND_DETAIL = { name: 'Солдат' }
const SUBRACES = [{ id: 21, name: 'Дворф-горец' }, { id: 22, name: 'Дворф-щитовик' }]
const SUBCLASSES = [{ id: 31, name: 'Мистический рыцарь' }, { id: 32, name: 'Чемпион' }]
const FEATS = [
  { id: 1, feat_id: 10, feat: { name: 'Тяжеловес', description: 'Один раз в свой ход, промахнувшись рукопашной атакой, вы можете перебросить кубик атаки.' } },
]

const BACKGROUNDS_CATALOG = [
  { id: 5, name: 'Солдат', description: 'Прошли выучку в армии, познав дисциплину и цену войны.', granted_skills: [{ id: 1, name: 'Атлетика' }], features: [{ id: 601, name: 'Военное звание', description: 'Солдаты признают ваш авторитет и статус.' }] },
  { id: 6, name: 'Отшельник', description: 'Годы, проведённые в уединении, дали время для размышлений.', granted_skills: [{ id: 12, name: 'Медицина' }], features: [] },
]

const ATTACK_ITEMS = [
  { id: 1, item_id: 1, is_equipped: true, item: { name: 'Боевой топор', item_type: 'WEAPON', damage_dice_count: 1, damage_dice_type: 'D8', damage_type: 'SLASHING', weapon_properties: 'VERSATILE' } },
  { id: 2, item_id: 2, is_equipped: false, item: { name: 'Ручной топор', item_type: 'WEAPON', damage_dice_count: 1, damage_dice_type: 'D6', damage_type: 'SLASHING' } },
  { id: 3, item_id: 3, is_equipped: true, item: { name: 'Кольчуга', item_type: 'ARMOR' } },
]
const SPELL_CATALOG = [
  { id: 1, name: 'Огненный снаряд', level: 'CANTRIP', school: 'EVOCATION' },
  { id: 2, name: 'Луч мороза', level: 'CANTRIP', school: 'EVOCATION' },
  { id: 3, name: 'Щит', level: 'LEVEL_1', school: 'ABJURATION' },
  { id: 4, name: 'Обнаружение магии', level: 'LEVEL_1', school: 'DIVINATION' },
  { id: 5, name: 'Кровожадный клинок', level: 'LEVEL_1', school: 'NECROMANCY' },
]
const KNOWN_SPELLS = [
  { spell_id: 1, spell: { name: 'Огненный снаряд', school: 'EVOCATION', level: 'CANTRIP', damage_dice_count: 1, damage_dice_type: 'D10', damage_type: 'FIRE' } },
  { spell_id: 3, spell: { name: 'Щит', level: 'LEVEL_1' } },
]
const SPELL_SLOTS = [{ spell_level: 'CANTRIP', total: 2 }, { spell_level: 'LEVEL_1', total: 2 }]

const FEATS_ALL = [
  { id: 10, name: 'Тяжеловес', ability_score_increases: [] },
  { id: 11, name: 'Атлет', ability_score_increases: [{ id: 1, ability: 'STR', amount: 1 }] },
  { id: 12, name: 'Мастер боя', ability_score_increases: [], min_level: 8 },
  { id: 13, name: 'Одарённый', ability_score_increases: [{ id: 2, ability: 'CON', amount: 1 }], prerequisite_ability: 'CON', prerequisite_minimum_score: 13 },
]

function seedQueryClient(qc, character) {
  qc.setQueryData(queryKeys.catalog.classDetail(character.class_id), CLASS_DETAIL)
  qc.setQueryData(queryKeys.catalog.backgroundDetail(character.background_id), BACKGROUND_DETAIL)
  qc.setQueryData(['catalog', 'races', character.race_id, 'subraces'], SUBRACES)
  qc.setQueryData(['catalog', 'classes', character.class_id, 'subclasses'], SUBCLASSES)
  qc.setQueryData(queryKeys.characters.feats(character.id), FEATS)
  qc.setQueryData(queryKeys.characters.items(character.id), ATTACK_ITEMS)
  qc.setQueryData(queryKeys.characters.spells(character.id), { spells: KNOWN_SPELLS, spell_slots: SPELL_SLOTS })
  qc.setQueryData(queryKeys.catalog.backgrounds({}), BACKGROUNDS_CATALOG)
  qc.setQueryData(queryKeys.catalog.spells({ size: 100 }), SPELL_CATALOG)
  qc.setQueryData(['catalog', 'feats', 'all', ''], FEATS_ALL)
}

const noop = () => {}

/**
 * The character sheet's dialogs — HP/Armor/Money/Level-up/Settings (all
 * backed by the `Modal` shared shell), plus the pickers Settings can open
 * (Subrace/Subclass/Background), the Attack and Spell pickers reached from
 * the Attacks/Spells tabs, and the ASI-vs-Feat level-up choice (its own
 * fixed-overlay dialog, not `Modal`). Pass `which` to pick one at a time,
 * over a shared mock character + a QueryClient seeded with every
 * catalog/character sub-resource these dialogs read (mutations fail
 * gracefully — there's no backend — the seeded data just stays as-is).
 */
export function SheetModals({ which = 'hp' }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc, MOCK_CHARACTER)
    return qc
  })

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ background: 'var(--color-stone-950)', height: '100vh' }}>
        {which === 'hp' && <HpModal character={MOCK_CHARACTER} onClose={noop} onDelta={noop} onTempHp={noop} onRest={noop} />}
        {which === 'armor' && <ArmorModal character={MOCK_CHARACTER} onClose={noop} onSave={noop} />}
        {which === 'money' && <MoneyModal character={MOCK_CHARACTER} onClose={noop} onError={noop} />}
        {which === 'levelUp' && <LevelUpModal character={MOCK_CHARACTER} onClose={noop} onError={noop} onRollToast={noop} />}
        {which === 'settings' && <CharacterSettingsModal character={MOCK_CHARACTER} onClose={noop} onError={noop} />}
        {which === 'attack' && (
          <AttackModal characterId={MOCK_CHARACTER.id} onClose={noop} onSaved={noop} onError={noop} classSpellcastingAbility="INT" />
        )}
        {which === 'spellPicker' && <SpellPickerModal character={MOCK_CHARACTER} onClose={noop} onError={noop} />}
        {which === 'subracePicker' && (
          <SubracePickerModal character={MOCK_CHARACTER} currentId={MOCK_CHARACTER.subrace_id} onClose={noop} onPick={noop} />
        )}
        {which === 'subclassPicker' && (
          <SubclassPickerModal character={MOCK_CHARACTER} currentId={MOCK_CHARACTER.subclass_id} onClose={noop} onPick={noop} />
        )}
        {which === 'backgroundPicker' && (
          <BackgroundPickerModal currentId={MOCK_CHARACTER.background_id} onClose={noop} onPick={noop} />
        )}
        {which === 'asiChoice' && (
          <AsiChoiceModal
            level={4}
            grantedFeatIds={[]}
            abilityTotals={{ STR: 18, DEX: 12, CON: 16, INT: 14, WIS: 12, CHA: 8 }}
            onCancel={noop}
            onConfirm={noop}
          />
        )}
      </div>
    </QueryClientProvider>
  )
}
