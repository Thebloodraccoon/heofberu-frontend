import { abilityLabels, armorProficiencyLabels, diceTypeLabels, label, ruLevel, sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Badge, Card } from '@/components/ui'
import { SkillChips, itemName } from './detailHelpers.jsx'

const SPELL_LEVELS = [
  'LEVEL_1',
  'LEVEL_2',
  'LEVEL_3',
  'LEVEL_4',
  'LEVEL_5',
  'LEVEL_6',
  'LEVEL_7',
  'LEVEL_8',
  'LEVEL_9',
]

const DICE_MAX = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20, D100: 100 }

function buildRows(cls, extraFeatures) {
  const featuresByLevel = {}
  for (const feature of cls.features ?? []) {
    const lv = feature.level ?? 0
    if (!featuresByLevel[lv]) featuresByLevel[lv] = []
    featuresByLevel[lv].push({ ...feature, fromSubclass: false })
  }
  for (const feature of extraFeatures ?? []) {
    const lv = feature.level ?? 0
    if (!featuresByLevel[lv]) featuresByLevel[lv] = []
    featuresByLevel[lv].push({ ...feature, fromSubclass: true })
  }
  const slotsByLevel = {}
  for (const slot of cls.spell_slot_progression ?? []) {
    if (!slotsByLevel[slot.class_level]) slotsByLevel[slot.class_level] = {}
    slotsByLevel[slot.class_level][slot.spell_level] = slot.slots
  }
  const hasSlots = (cls.spell_slot_progression ?? []).some((slot) => slot.slots > 0)
  const rows = []
  for (let level = 1; level <= 20; level += 1) {
    rows.push({
      level,
      proficiencyBonus: Math.ceil(level / 4) + 1,
      features: featuresByLevel[level] ?? [],
      slots: slotsByLevel[level] ?? {},
    })
  }
  return { rows, hasSlots }
}

function Section({ title, children, noBorder }) {
  return (
    <div className={`mb-[3px] mt-4 pt-3 ${noBorder ? '' : 'border-t border-stone-700/70'}`}>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </div>
  )
}

export default function ClassDetailCard({ cls, selectedSubId }) {
  const die = DICE_MAX[cls.hit_dice]
  const average = Math.floor(die / 2) + 1
  const diceRu = diceTypeLabels[cls.hit_dice] ?? cls.hit_dice
  const subclasses = cls.subclasses ?? []
  const selectedSub = selectedSubId
    ? subclasses.find((s) => String(s.id) === String(selectedSubId))
    : null

  const subFeatures = selectedSub
    ? (selectedSub.features ?? []).map((f) => ({
        ...f,
        fromSubclass: true,
        subclassName: selectedSub.name,
      }))
    : []
  const { rows, hasSlots } = buildRows(cls, subFeatures)

  const features = [
    ...(cls.features ?? []).map((f) => ({ ...f, fromSubclass: false })),
    ...subFeatures,
  ].sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.id - b.id)

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{cls.name}</h1>
          <Badge className="my-[5px]">{`Кость хитов ${diceRu}`}</Badge>
        </div>
        {selectedSub && (
          <p className="mt-1 font-display text-lg font-semibold text-ember">{selectedSub.name}</p>
        )}
      </div>

      {selectedSub ? (
        selectedSub.description && (
          <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
            {selectedSub.description}
          </p>
        )
      ) : (
        cls.description && (
          <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
            {cls.description}
          </p>
        )
      )}

      <Section title="Хиты">
        <ul className="space-y-1 text-sm text-stone-300">
          <li>
            <span className="font-medium text-stone-200">Кость Хитов: </span>
            {`1${diceRu} за каждый уровень`}
          </li>
          <li>
            <span className="font-medium text-stone-200">Хиты на 1 уровне: </span>
            {`${die} + модификатор Телосложения`}
          </li>
          <li>
            <span className="font-medium text-stone-200">Хиты на следующих уровнях: </span>
            {`1${diceRu} (или ${average}) + модификатор Телосложения за каждый уровень этого класса, после первого (минимум 1)`}
          </li>
        </ul>
      </Section>

      <Section title="Развитие по уровням" noBorder>
        <div className="overflow-x-auto rounded-lg bg-stone-900/40">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-stone-700/60 bg-stone-800/50 text-left text-xs uppercase tracking-wide text-stone-400">
                <th rowSpan={hasSlots ? 2 : 1} className="px-3 py-2 align-middle font-medium">Ур.</th>
                <th rowSpan={hasSlots ? 2 : 1} className="px-3 py-2 align-middle font-medium">БМ</th>
                <th rowSpan={hasSlots ? 2 : 1} className="px-3 py-2 align-middle font-medium">Умения</th>
                {hasSlots && (
                  <th colSpan={9} className="px-3 py-2 text-center font-medium">
                    Ячейки заклинаний
                  </th>
                )}
              </tr>
              {hasSlots && (
                <tr className="border-b border-stone-700/60 bg-stone-800/30 text-center text-xs text-stone-400">
                  {SPELL_LEVELS.map((lv, i) => (
                    <th key={lv} className="px-1 py-1 font-normal">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level} className="border-b border-stone-700/40 align-top odd:bg-stone-900/40">
                  <td className="px-3 py-2 align-top font-medium text-stone-100">{row.level}</td>
                  <td className="px-3 py-2 align-top text-stone-200">+{row.proficiencyBonus}</td>
                  <td className="px-3 py-2 align-top text-stone-300">
                    {row.features.length > 0 ? (
                      <span className="flex flex-col gap-0.5">
                        {row.features.map((f, i) => (
                          <span key={f.id ?? `x-${i}`}>
                            <span className={f.fromSubclass ? 'rounded bg-ember/10 px-0.5' : ''}>
                              <span className={f.fromSubclass ? 'font-medium text-ember' : ''}>
                                {f.name}
                              </span>
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : '—'}
                  </td>
                  {hasSlots &&
                    SPELL_LEVELS.map((lv) => (
                      <td key={lv} className="px-1 py-2 text-center text-stone-300">
                        {row.slots[lv] ?? '—'}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subFeatures.length > 0 && (
          <p className="sr-only">
            Умения подкласса подсвечены янтарным.
          </p>
        )}
      </Section>

      <Section title="Владение">
        <dl className="space-y-1 text-sm text-stone-300">
          <div>
            <dt className="inline font-medium text-stone-200">Спасброски: </dt>
            <dd className="inline">{cls.saving_throws.map((s) => abilityLabels[s.ability]).join(', ')}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-stone-200">Основные характеристики: </dt>
            <dd className="inline">
              {cls.primary_abilities.map((p) => abilityLabels[p.ability]).join(', ')}
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <dt className="inline font-medium text-stone-200">Навыки </dt>
            {cls.skill_choice_count > 0 && (
              <dd className="inline text-stone-300">{`выберите ${cls.skill_choice_count}:`}</dd>
            )}
            <SkillChips
              names={cls.available_skills.map((s) => {
                const n = itemName(s)
                return skillLabels[n] ?? sentenceCase(n)
              })}
            />
          </div>
          <div>
            <dt className="inline font-medium text-stone-200">Владение доспехами: </dt>
            <dd className="inline">
              {(cls.armor_proficiencies ?? []).length === 0
                ? '—'
                : cls.armor_proficiencies
                    .map((a) => armorProficiencyLabels[a.armor_type] ?? a.armor_type)
                    .join(', ')}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Снаряжение">
        <p className="text-sm leading-relaxed text-stone-300">
          Вы начинаете со следующим снаряжением в дополнение к снаряжению, полученному за вашу
          предысторию:
        </p>
        {(cls.starting_items ?? []).length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-300">
            {cls.starting_items.map((entry, i) => (
              <li key={i}>
                {entry.quantity > 1 && <span className="font-medium text-ember">{entry.quantity}× </span>}
                {entry.item?.name ?? entry.item_id}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-stone-500">—</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          В качестве альтернативы базовому снаряжению класса и предыстории, вы можете получить 5к4
          × 10 зм. монет и приобрести себе снаряжение самостоятельно.
        </p>
      </Section>

      <Section title="Особенности и умения">
        {features.length === 0 ? (
          <p className="text-sm text-stone-500">Особенностей не указано</p>
        ) : (
          <ul className="space-y-3">
            {features.map((feature) => (
              <li
                key={feature.id}
                className={`my-[5px] rounded-lg border p-3 ${
                  feature.fromSubclass
                    ? 'border-ember/60 bg-ember/5'
                    : 'border-stone-700/60 bg-stone-900/60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-semibold ${feature.fromSubclass ? 'text-ember' : 'text-stone-100'}`}>
                    {feature.name}
                  </p>
                  {feature.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(feature.level)}</Badge>}
                  {feature.fromSubclass && feature.subclassName && (
                    <Badge tone="accent" className="my-[5px]">Подкласс: {feature.subclassName}</Badge>
                  )}
                </div>
                {feature.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                    {feature.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Card>
  )
}
