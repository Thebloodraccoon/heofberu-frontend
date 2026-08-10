import { abilityLabels, diceTypeLabels, ruLevel } from '../labels.js'
import { Badge, Card } from './ui.jsx'

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

function Section({ title, children }) {
  return (
    <div className="mt-6 border-t border-stone-700/70 pt-4">
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
  const featuresByLevel = {}
  for (const f of features) {
    const lv = f.level ?? 0
    if (!featuresByLevel[lv]) featuresByLevel[lv] = []
    featuresByLevel[lv].push(f)
  }
  const featureLevels = Object.keys(featuresByLevel).map(Number).sort((a, b) => a - b)

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-stone-100">{cls.name}</h1>
        <Badge>{`Кость хитов ${diceRu}`}</Badge>
        {cls.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
      </div>

      {cls.description && (
        <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {cls.description}
        </p>
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

      <Section title="Таблица прогрессии">
        <div className="overflow-x-auto rounded-lg border border-stone-700/60">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-stone-700/60 bg-stone-800/50 text-left text-xs uppercase tracking-wide text-stone-400">
                <th className="px-3 py-2 font-medium">Ур.</th>
                <th className="px-3 py-2 font-medium">БМ</th>
                <th className="px-3 py-2 font-medium">Умения</th>
                {hasSlots && (
                  <th colSpan={9} className="px-3 py-2 text-center font-medium">
                    Ячейки заклинаний
                  </th>
                )}
              </tr>
              {hasSlots && (
                <tr className="border-b border-stone-700/60 bg-stone-800/30 text-center text-xs text-stone-400">
                  <th colSpan={3} className="py-1 font-normal" />
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
                  <td className="px-3 py-2 font-medium text-stone-100">{row.level}</td>
                  <td className="px-3 py-2 text-stone-200">+{row.proficiencyBonus}</td>
                  <td className="px-3 py-2 text-stone-300">
                    {row.features.length > 0 ? (
                      row.features.map((f, i) => (
                        <span key={f.id ?? `x-${i}`}>
                          {i > 0 && ', '}
                          <span className={f.fromSubclass ? 'rounded bg-ember/10 px-0.5' : ''}>
                            <span className={f.fromSubclass ? 'font-medium text-ember' : ''}>
                              {f.name}
                            </span>
                          </span>
                        </span>
                      ))
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
          <p className="mt-2 text-xs text-stone-500">
            Умения подкласса подсвечены <span className="text-ember">янтарным</span>.
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
          <div>
            <dt className="inline font-medium text-stone-200">Навыки: </dt>
            <dd className="inline">
              {cls.skill_choice_count > 0 ? `Выберите ${cls.skill_choice_count}: ` : ''}
              {cls.available_skills.map((s) => s.name).join(', ')}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Фичи класса">
        {features.length === 0 ? (
          <p className="text-sm text-stone-500">Особенностей не указано</p>
        ) : (
          <div className="space-y-4">
            {featureLevels.map((lv) => (
              <div key={lv}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {lv === 0 ? 'Базовые умения' : ruLevel(lv)}
                </p>
                <ul className="space-y-3">
                  {featuresByLevel[lv].map((feature) => (
                    <li
                      key={feature.id}
                      className={`rounded-lg border p-3 ${
                        feature.fromSubclass
                          ? 'border-ember/60 bg-ember/5'
                          : 'border-stone-700/60 bg-stone-900/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`font-semibold ${feature.fromSubclass ? 'text-ember' : 'text-stone-100'}`}>
                          {feature.name}
                        </p>
                        {feature.level != null && <Badge tone="accent">{ruLevel(feature.level)}</Badge>}
                        {feature.fromSubclass && feature.subclassName && (
                          <Badge tone="accent">Подкласс: {feature.subclassName}</Badge>
                        )}
                        {feature.is_homebrew && <Badge>Homebrew</Badge>}
                      </div>
                      {feature.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                          {feature.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Подклассы">
        {subclasses.length === 0 ? (
          <p className="text-sm text-stone-500">Подклассов не указано</p>
        ) : selectedSub ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3 className="font-display text-xl font-bold text-stone-100">{selectedSub.name}</h3>
              <Badge>Разблокировка: {ruLevel(selectedSub.unlock_level)}</Badge>
              {selectedSub.is_homebrew && <Badge tone="accent">Homebrew</Badge>}
            </div>
            {selectedSub.description && (
              <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
                {selectedSub.description}
              </p>
            )}
            {(selectedSub.features ?? []).length > 0 ? (
              <ul className="mt-4 space-y-3">
                {(selectedSub.features ?? []).map((feature) => (
                  <li key={feature.id} className="rounded-lg border border-ember/60 bg-ember/5 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ember">{feature.name}</p>
                      {feature.level != null && <Badge tone="accent">{ruLevel(feature.level)}</Badge>}
                      {feature.is_homebrew && <Badge>Homebrew</Badge>}
                    </div>
                    {feature.description && (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                        {feature.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-500">Умений подкласса не указано</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-stone-500">Выберите подкласс в списке слева.</p>
        )}
      </Section>
    </Card>
  )
}
