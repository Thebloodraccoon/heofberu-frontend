import { Link } from 'react-router-dom'
import { fieldLabel, sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Card, RichText } from '@/components/ui'
import { isEmptyValue, itemName, skipFields, Section, FeatureCards, FieldValue, SkillChips } from './detailHelpers.jsx'

function itemCountPlural(n) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'предмет'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'предмета'
  return 'предметов'
}

const LETTERS = 'абвгдежзиклмнопрстуфхцчшщыэюя'

function letterOf(i) {
  return LETTERS[i] ?? String(i + 1)
}

function ItemLink({ item }) {
  const id = item?.item_id ?? item?.id
  const name = sentenceCase(item?.item?.name ?? item?.name ?? itemName(id))
  if (id == null) return <span>{name}</span>
  return (
    <Link
      to={`/catalog/items/${id}`}
      className="font-medium text-ember/90 no-underline transition hover:text-ember"
    >
      {name}
    </Link>
  )
}

const suggestionTypeLabels = {
  PERSONALITY_TRAIT: 'Черта характера',
  IDEAL: 'Идеал',
  BOND: 'Привязанность',
  FLAW: 'Слабость',
}

export default function BackgroundDetailCard({ bg }) {
  const skills = bg.granted_skills ?? []
  const skillText = (s) => {
    const n = itemName(s)
    return skillLabels[n] ?? sentenceCase(n)
  }

  const suggestionsByType = new Map()
  for (const s of bg.suggestions ?? []) {
    if (!s.text) continue
    if (!suggestionsByType.has(s.suggestion_type)) suggestionsByType.set(s.suggestion_type, [])
    suggestionsByType.get(s.suggestion_type).push(s.text)
  }
  const suggestionRows = Object.entries(suggestionTypeLabels)
    .map(([type, lbl]) => [lbl, suggestionsByType.get(type)])
    .filter(([, texts]) => texts && texts.length > 0)

  const extra = Object.entries(bg).filter(
    ([k]) =>
      !skipFields.has(k) &&
      !['description', 'features', 'granted_skills', 'starting_items', 'suggestions', 'starting_choice_groups', 'starting_gold'].includes(k)
  )
  const extraVisible = extra.filter(([, v]) => !isEmptyValue(v))

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(bg.name)}</h1>
        </div>
      </div>

      {bg.description && <RichText value={bg.description} className="description-blockquote" />}

      {skills.length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Владение навыками: </span>
          <SkillChips
            names={skills
              .map((s) => ({
                id: s.id ?? s.item_id,
                __name: skillText(s),
              }))
              .sort((a, b) => a.__name.localeCompare(b.__name, 'ru'))}
          />
        </p>
      )}

      {suggestionRows.length > 0 && (
        <Section title="Персонализация">
          <p className="mb-3 text-sm leading-relaxed text-stone-300">
            Ниже приведены готовые варианты черт характера, идеалов, привязанностей и слабостей —
            выберите подходящий вариант из таблицы или, при желании, определите его броском кубика.
          </p>
          <div className="flex flex-col gap-4">
            {suggestionRows.map(([lbl, texts]) => (
              <div key={lbl} className="overflow-hidden rounded-lg border border-stone-700/60 bg-stone-900/60">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th className="w-12">{`к${texts.length}`}</th>
                      <th>{lbl}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {texts.map((t, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <RichText value={t} className="inline leading-relaxed" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Section>
      )}

      {bg.features && bg.features.length > 0 && (
        <Section title="Особенности и умения">
          <FeatureCards features={bg.features} />
        </Section>
      )}

      {((bg.starting_items ?? []).length > 0 ||
        (bg.starting_choice_groups ?? []).length > 0 ||
        bg.starting_gold > 0) && (
        <Section title="Снаряжение">
          <p className="mb-3 text-sm leading-relaxed text-stone-300">
            Из прошлого, что осталось за спиной, вы взяли лишь немногое — но оно всегда при вас:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-stone-300">
            {(bg.starting_choice_groups ?? []).map((group, gi) => (
              <li key={`c-${gi}`}>
                {(group.options ?? []).map((opt, oi) => (
                  <span key={opt.id ?? opt.item_id}>
                    {oi > 0 && <span> или </span>}
                    {letterOf(oi)}){' '}
                    {opt.quantity > 1 && <span className="font-medium text-ember">{opt.quantity}× </span>}
                    <ItemLink item={opt} />
                  </span>
                ))}
                {(group.pick_count ?? 1) > 1 && (
                  <span className="text-stone-500">
                    {' '}
                    — выберите {group.pick_count} {itemCountPlural(group.pick_count)}
                  </span>
                )}
              </li>
            ))}
            {bg.starting_items.map((entry, i) => (
              <li key={`m-${i}`}>
                {entry.quantity > 1 && <span className="font-medium text-ember">{entry.quantity}× </span>}
                <ItemLink item={entry} />
              </li>
            ))}
            {bg.starting_gold > 0 && (
              <li>
                <span className="font-medium text-ember">{bg.starting_gold}</span> золотых монет
              </li>
            )}
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
