// Design-sync reference composition — the character sheet's own dialogs,
// each backed by the REAL modal component, a mock character, and (for the
// two that read catalog data) a seeded QueryClient. Nested picker modals
// opened from inside CharacterSettingsModal (subrace/subclass/background
// pickers, ASI choice) are real components too and will work if opened —
// they read the same seeded cache — but aren't separately previewed here.
// See .design-sync/NOTES.md.
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import HpModal from '@/features/characters/components/sheet/HpModal.jsx'
import ArmorModal from '@/features/characters/components/sheet/ArmorModal.jsx'
import MoneyModal from '@/features/characters/components/sheet/MoneyModal.jsx'
import LevelUpModal from '@/features/characters/components/sheet/LevelUpModal.jsx'
import CharacterSettingsModal from '@/features/characters/components/sheet/CharacterSettingsModal.jsx'

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

function seedQueryClient(qc, character) {
  qc.setQueryData(queryKeys.catalog.classDetail(character.class_id), CLASS_DETAIL)
  qc.setQueryData(queryKeys.catalog.backgroundDetail(character.background_id), BACKGROUND_DETAIL)
  qc.setQueryData(['catalog', 'races', character.race_id, 'subraces'], SUBRACES)
  qc.setQueryData(['catalog', 'classes', character.class_id, 'subclasses'], SUBCLASSES)
  qc.setQueryData(queryKeys.characters.feats(character.id), FEATS)
}

const noop = () => {}

/**
 * The character sheet's dialogs: HP (delta/temp-HP/rest), Armor (AC/shield),
 * Money (gold/silver/copper), Level-up (HP gain + ASI/feat flow), and
 * character Settings (name, subrace/subclass/background pickers). Pass
 * `which` to pick which one renders, one at a time — each is the real modal
 * component over a mock character. `hp`/`armor` are pure; `money`/`levelUp`/
 * `settings` also read/write via a local seeded QueryClient (mutations fail
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
      <div style={{ background: 'var(--color-stone-950)', minHeight: 480 }}>
        {which === 'hp' && <HpModal character={MOCK_CHARACTER} onClose={noop} onDelta={noop} onTempHp={noop} onRest={noop} />}
        {which === 'armor' && <ArmorModal character={MOCK_CHARACTER} onClose={noop} onSave={noop} />}
        {which === 'money' && <MoneyModal character={MOCK_CHARACTER} onClose={noop} onError={noop} />}
        {which === 'levelUp' && <LevelUpModal character={MOCK_CHARACTER} onClose={noop} onError={noop} onRollToast={noop} />}
        {which === 'settings' && <CharacterSettingsModal character={MOCK_CHARACTER} onClose={noop} onError={noop} />}
      </div>
    </QueryClientProvider>
  )
}
