import { useCharacterAnsweredChoices } from '@/features/characters/queries.js'
import { useItemNames, useSkills, useSpellNames } from '@/features/catalog/queries.js'
import { bundleItemIds, describeChoiceKind, describeEffectBundle } from '@/lib/utils/effectBundle.js'

// Уже сделанные игроком выборы способностей (расы/класса/черты) — ответная
// сторона модалки «Выборы» (PendingChoicesModal): по маленькой таблице
// «Выбор | Что выбрано» на каждую особенность (в стиле таблиц владений), с
// подставленным тем, что игрок назвал для открытого варианта (навык,
// заклинание, характеристика, инструмент).
// Ничего не показывает, пока не отвечена ни одна группа выбора. Живёт во
// вкладке «Развитие персонажа», не в панели характеристик.
export default function AnsweredChoicesSection({ characterId }) {
  const { data: answered = [] } = useCharacterAnsweredChoices(characterId)
  const { data: skillsCatalog = [] } = useSkills()
  const choices = answered.flatMap((g) => g.choices ?? [])
  const itemNames = useItemNames(choices.flatMap(bundleItemIds))
  const spellNames = useSpellNames(
    choices.flatMap((c) => [c.picked_spell_id, ...(c.spell_effects ?? []).map((e) => e.spell_id)]).filter(Boolean),
  )
  const names = {
    skillNames: Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name])),
    spellNames,
    itemNames,
  }

  if (answered.length === 0) return null

  return (
    <section aria-labelledby="answered-choices-heading" className="space-y-6">
      <h2 id="answered-choices-heading" className="sheet-section-label after:hidden">Выборы способностей</h2>
      {answered.map((grant) => (
        <div key={grant.character_feature_id}>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">{grant.feature_name}</p>
          <div className="overflow-hidden rounded-lg border border-stone-800">
            <table className="sheet-table w-full table-fixed" aria-label={grant.feature_name}>
              <thead>
                <tr>
                  <th scope="col" className="w-1/2">Выбор</th>
                  <th scope="col" className="w-1/2">Что выбрано</th>
                </tr>
              </thead>
              <tbody>
                {grant.choices.map((c, i) => (
                  <tr key={`${c.choice_group_id}-${c.choice_option_id}-${i}`}>
                    <td className="text-stone-200">{describeChoiceKind(c)}</td>
                    <td className="text-stone-400">{describeEffectBundle(c, names)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
