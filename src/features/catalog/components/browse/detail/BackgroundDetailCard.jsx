import { fieldLabel, label, skillLabels } from '@/lib/i18n/index.js'
import { Card, StatTable } from '@/components/ui'
import { isEmptyValue, itemName, skipFields, Section, FeatureCards, FieldValue, SkillChips } from './detailHelpers.jsx'

export default function BackgroundDetailCard({ bg }) {
  const skills = bg.granted_skills ?? []
  const skillText = (s) => {
    const n = itemName(s)
    return skillLabels[n] ?? label(n)
  }

  const suggestionFields = [
    ['personality_traits_suggestions', 'Черты личности'],
    ['ideals_suggestions', 'Идеалы'],
    ['bonds_suggestions', 'Привязанности'],
    ['flaws_suggestions', 'Слабости'],
  ]
  const suggestionRows = suggestionFields
    .map(([k, lbl]) => [lbl, bg[k]])
    .filter(([, v]) => !isEmptyValue(v))

  const extra = Object.entries(bg).filter(
    ([k]) =>
      !skipFields.has(k) &&
      !['description', 'features', 'granted_skills', 'starting_items'].includes(k) &&
      !suggestionFields.some(([f]) => f === k)
  )
  const extraVisible = extra.filter(([, v]) => !isEmptyValue(v))

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{bg.name}</h1>
        </div>
      </div>

      {bg.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {bg.description}
        </p>
      )}

      {skills.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Владение навыками: </span>
          <SkillChips names={skills.map(skillText)} />
        </p>
      )}

      {suggestionRows.length > 0 && (
        <Section title="Личность">
          <div className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-900/60">
            <StatTable
              rows={suggestionRows.map(([lbl, v]) => [
                lbl,
                <span key={lbl} className="whitespace-pre-wrap">{v}</span>,
              ])}
            />
          </div>
        </Section>
      )}

      {bg.features && bg.features.length > 0 && (
        <Section title="Особенности и умения">
          <FeatureCards features={bg.features} />
        </Section>
      )}

      {(bg.starting_items ?? []).length > 0 && (
        <Section title="Снаряжение">
          <p className="mb-3 text-sm leading-relaxed text-stone-300">
            Из прошлого, что осталось за спиной, вы взяли лишь немногое — но оно всегда при вас:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-300">
            {bg.starting_items.map((entry, i) => (
              <li key={i}>
                {entry.quantity > 1 && <span className="font-medium text-ember">{entry.quantity}× </span>}
                {entry.item?.name ?? entry.item_id}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {extraVisible.length > 0 && (
        <Section title="Снаряжения">
          <dl className="grid gap-3 sm:grid-cols-2">
            {extraVisible.map(([key, value]) => (
              <div key={key} className="my-[5px] rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
                <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ember/80">
                  {fieldLabel(key)}
                </dt>
                <dd className="text-sm leading-relaxed">
                  <FieldValue value={value} />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </Card>
  )
}
