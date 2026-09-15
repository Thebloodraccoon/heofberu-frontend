import { useCharacterAnsweredChoices } from '@/features/characters/queries.js'
import { useSkills, useSpells } from '@/features/catalog/queries.js'
import { describeEffectBundle } from '@/lib/utils/effectBundle.js'

// Уже сделанные игроком выборы способностей (расы/класса/черты) — ответная
// сторона модалки «Выборы» (PendingChoicesModal). Ничего не показывает,
// пока не отвечена ни одна группа выбора. Живёт во вкладке «Развитие
// персонажа», не в панели характеристик.
export default function AnsweredChoicesSection({ characterId }) {
  const { data: answered = [] } = useCharacterAnsweredChoices(characterId)
  const { data: skillsCatalog = [] } = useSkills()
  const { data: spellsCatalog = [] } = useSpells()
  const names = {
    skillNames: Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name])),
    spellNames: Object.fromEntries(spellsCatalog.map((s) => [s.id, s.name])),
  }

  if (answered.length === 0) return null

  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Выборы способностей</p>
      <ul className="space-y-1.5">
        {answered.map((grant) => (
          <li
            key={grant.character_feature_id}
            className="rounded border border-stone-800 bg-stone-900/40 px-2.5 py-1.5 text-xs"
          >
            <p className="font-medium text-stone-200">{grant.feature_name}</p>
            <ul className="mt-0.5 space-y-0.5 text-stone-400">
              {grant.choices.map((c, i) => (
                <li key={c.choice_group_id ?? i}>
                  Выбор {i + 1}: {describeEffectBundle(c, names)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
