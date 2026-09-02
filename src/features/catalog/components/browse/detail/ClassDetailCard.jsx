import { useState } from 'react'
import { Link } from 'react-router-dom'
import { abilityLabels, armorProficiencyLabels, diceTypeLabels, ruLevel, sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { abilityName } from '@/lib/utils/ability.js'
import { Badge, Card, AccordionItem } from '@/components/ui'
import { itemName } from './detailHelpers.jsx'
import CatalogImage from '../CatalogImage.jsx'

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

// Русская форма существительного «предмет» для числа n.
function itemCountPlural(n) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'предмет'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'предмета'
  return 'предметов'
}

// Буквенные обозначения вариантов: а), б), в), г)... для «выбери-себе-из-N».
const LETTERS = 'абвгдежзиклмнопрстуфхцчшщыэюя'

function letterOf(i) {
  return LETTERS[i] ?? String(i + 1)
}

function ItemLink({ item }) {
  const id = item?.item_id ?? item?.id
  const name = item?.item?.name ?? item?.name ?? itemName(id)
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

// Статичное умение PHB: показывается в таблице у всех классов, но нигде не хранится.
export const ASI_LEVELS = [4, 8, 12, 16, 19]
const ASI_FEATURE_DESCRIPTION =
  'При достижении 4, 8, 12, 16 и 19 уровней вы можете повысить значение одной из ваших характеристик на 2 ' +
  'или двух характеристик на 1 или выбрать черту. Как обычно, значение характеристики при этом не должно превысить 20.'

const asiFeature = (level) => ({
  id: `asi-${level}`,
  name: 'Улучшение характеристик',
  description: ASI_FEATURE_DESCRIPTION,
  isStaticAsi: true,
})

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
    if (slot.spell_level === 'CANTRIP') {
      slotsByLevel[slot.class_level].CANTRIP = slot.slots
    } else {
      slotsByLevel[slot.class_level][slot.spell_level] = slot.slots
    }
  }
  const progression = cls.spell_slot_progression ?? []
  const hasSlots = progression.some((slot) => slot.spell_level !== 'CANTRIP' && slot.slots > 0)
  const hasCantrips = progression.some((slot) => slot.spell_level === 'CANTRIP' && slot.slots > 0)
  const rows = []
  for (let level = 1; level <= 20; level += 1) {
    const staticAsi = ASI_LEVELS.includes(level) ? [asiFeature(level)] : []
    rows.push({
      level,
      proficiencyBonus: Math.ceil(level / 4) + 1,
      features: [...staticAsi, ...(featuresByLevel[level] ?? [])],
      slots: slotsByLevel[level] ?? {},
    })
  }
  return { rows, hasSlots, hasCantrips }
}

function Section({ title, children }) {
  return (
    <div className="mb-[3px] mt-4 pt-3">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
        <span className="h-px flex-1 bg-stone-700/70" aria-hidden="true" />
      </div>
      {children}
    </div>
  )
}

export default function ClassDetailCard({ cls, selectedSubId }) {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
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
  const { rows, hasSlots, hasCantrips } = buildRows(cls, subFeatures)

  const asiCards = ASI_LEVELS.map((level) => ({ ...asiFeature(level), level }))
  const features = [
    ...(cls.features ?? []).map((f) => ({ ...f, fromSubclass: false })),
    ...subFeatures,
    ...asiCards,
  ].sort((a, b) => {
    const byLevel = (a.level ?? 0) - (b.level ?? 0)
    if (byLevel !== 0) return byLevel
    if (!!a.isStaticAsi !== !!b.isStaticAsi) return a.isStaticAsi ? -1 : 1
    return Number(a.id) - Number(b.id)
  })
  const featureAnchor = (id) => `feature-${String(id)}`

  const isExpanded = (id) => !collapsedIds.has(String(id))

  const toggleFeature = (id) => {
    const key = String(id)
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const scrollToFeature = (id) => {
    setCollapsedIds((prev) => {
      if (!prev.has(String(id))) return prev
      const next = new Set(prev)
      next.delete(String(id))
      return next
    })
    const el = document.getElementById(featureAnchor(id))
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('highlight-active')
    window.setTimeout(() => el.classList.remove('highlight-active'), 1500)
  }

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="order-2 min-w-0 flex-1 sm:order-1">
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
              <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-sm leading-relaxed text-stone-200">
                {selectedSub.description}
              </p>
            )
          ) : (
            cls.description && (
              <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-sm leading-relaxed text-stone-200">
                {cls.description}
              </p>
            )
          )}

          <div className="mt-4">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">Хиты</h2>
              <span className="h-px flex-1 bg-stone-700/70" aria-hidden="true" />
            </div>
            <ul className="space-y-1 text-sm leading-relaxed text-stone-300">
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
          </div>
        </div>

        <div className="order-1 w-full shrink-0 sm:order-2 sm:w-auto flex justify-center items-start">
          <CatalogImage
            imageUrl={selectedSub?.image_url ?? cls.image_url}
            alt={selectedSub ? selectedSub.name : cls.name}
            title={selectedSub ? selectedSub.name : cls.name}
          />
        </div>
      </div>

      <Section title="Развитие по уровням">
        <div className="overflow-x-auto rounded-lg border-x border-stone-500/60 bg-stone-900/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700/60 bg-stone-800/50 text-left text-xs uppercase tracking-wide text-stone-400">
                <th rowSpan={hasSlots ? 2 : 1} className="w-12 px-2 py-2 text-center align-middle font-medium">Ур.</th>
                <th rowSpan={hasSlots ? 2 : 1} className="w-14 px-2 py-2 text-center align-middle font-medium">БМ</th>
                <th rowSpan={hasSlots ? 2 : 1} className="px-3 py-2 align-middle font-medium">Умения</th>
                {hasCantrips && (
                  <th rowSpan={hasSlots ? 2 : 1} className="w-20 px-2 py-2 align-middle text-center font-medium">
                    Заговоры
                  </th>
                )}
                {hasSlots && (
                  <th colSpan={9} className="px-3 py-2 text-center font-medium">
                    Ячейки заклинаний
                  </th>
                )}
              </tr>
              {hasSlots && (
                <tr className="border-b border-stone-700/60 bg-stone-800/30 text-center text-xs text-stone-400">
                  {SPELL_LEVELS.map((lv, i) => (
                    <th key={lv} className="w-8 px-1 py-1 font-normal">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level} className="border-b border-stone-700/40 align-top odd:bg-stone-900/40">
                  <td className="px-3 py-2 text-center align-top font-medium text-stone-100">{row.level}</td>
                  <td className="px-3 py-2 text-center align-top text-stone-200">+{row.proficiencyBonus}</td>
                  <td className="break-words px-3 py-2 align-top text-stone-300">
                    {row.features.length > 0 ? (
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {row.features.map((f, i) => (
                          <span
                            key={f.id ?? `x-${i}`}
                            title={f.isStaticAsi ? f.description : undefined}
                          >
                            {f.isStaticAsi ? (
                              <button
                                type="button"
                                onClick={() => scrollToFeature(f.id)}
                                className="cursor-pointer text-left italic text-stone-400 transition-colors hover:text-ember"
                              >
                                {f.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => scrollToFeature(f.id)}
                                className={`cursor-pointer text-left transition-colors hover:text-ember ${
                                  f.fromSubclass ? 'rounded bg-ember/10 px-0.5 font-medium text-ember' : ''
                                }`}
                              >
                                {f.name}
                              </button>
                            )}
                          </span>
                        ))}
                      </span>
                    ) : '—'}
                  </td>
                  {hasCantrips && (
                    <td className="w-20 whitespace-nowrap px-2 py-2 text-center align-top text-stone-300">
                      {row.slots.CANTRIP ?? '—'}
                    </td>
                  )}
                  {hasSlots &&
                    SPELL_LEVELS.map((lv) => (
                      <td key={lv} className="whitespace-nowrap px-1 py-2 text-center text-stone-300">
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
        <dl className="space-y-1 text-sm leading-relaxed text-stone-300">
          <div>
            <dt className="inline font-medium text-stone-200">Спасброски: </dt>
            <dd className="inline">
              {(cls.saving_throws ?? []).map((s) => abilityLabels[s.ability]).join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium text-stone-200">Владение оружием: </dt>
            <dd className="inline">
              {(cls.weapon_proficiencies ?? []).length === 0
                ? '—'
                : cls.weapon_proficiencies
                    .map((w) => weaponProficiencyLabels[w.weapon_category] ?? w.weapon_category)
                    .join(', ')}
            </dd>
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
          <div className="pt-1">
            <p className="inline font-medium text-stone-200">
              Навыки{' '}
              {cls.skill_choice_count > 0 && (
                <span className="font-normal text-stone-300">{`(выберите ${cls.skill_choice_count})`}</span>
              )}
            </p>
            <div className="inline-flex flex-wrap gap-1.5 ml-2">
              {(cls.available_skills ?? [])
                .map((s) => ({ ...s, __name: skillLabels[itemName(s)] ?? sentenceCase(itemName(s)) }))
                .sort((a, b) => a.__name.localeCompare(b.__name, 'ru'))
                .map((s, i) => (
                  <Link
                    key={s.id ?? i}
                    to={`/catalog/skills/${s.id}`}
                    className="rounded bg-stone-800/80 px-1.5 py-0.5 text-sm font-semibold text-stone-100 transition hover:bg-ember/20 hover:text-ember"
                  >
                    {s.__name}
                  </Link>
                ))}
            </div>
          </div>
        </dl>
      </Section>

      <Section title="Снаряжение">
        <p className="text-sm leading-relaxed text-stone-300">
          Вы начинаете со следующим снаряжением в дополнение к снаряжению, полученному за вашу
          предысторию:
        </p>

        <ul className="mt-3 space-y-1 pl-5 text-sm leading-relaxed text-stone-300" style={{ listStyleType: 'disc' }}>
          {/* Сначала — группы выбора «выбери-себе-из-N» */}
          {(cls.starting_choice_groups ?? cls.choice_groups ?? []).map((group, gi) => (
            <li key={gi}>
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

          {/* Затем — обязательное снаряжение */}
          {(cls.starting_items ?? []).map((entry, i) => (
            <li key={`m-${i}`}>
              {entry.quantity > 1 && <span className="font-medium text-ember">{entry.quantity}× </span>}
              <ItemLink item={entry} />
            </li>
          ))}
        </ul>
        {(cls.starting_items ?? []).length === 0 &&
          (cls.starting_choice_groups ?? cls.choice_groups ?? []).length === 0 && (
            <p className="mt-3 text-sm text-stone-500">—</p>
          )}
      </Section>

      <Section title="Особенности и умения">
        {features.length === 0 ? (
          <p className="text-sm text-stone-500">Особенностей не указано</p>
        ) : (
          <ul className="flex flex-col gap-[5px]">
            {features.map((feature) => {
              const expanded = isExpanded(feature.id)
              return (
                <li
                  key={feature.id}
                  id={featureAnchor(feature.id)}
                  className={`scroll-mt-20 rounded-lg border py-3 pl-[10px] pr-[10px] transition-colors ${
                    feature.fromSubclass
                      ? 'border-ember/60 bg-ember/5'
                      : 'border-stone-700/60 bg-stone-900/60'
                  }`}
                >
                  <AccordionItem
                    open={expanded}
                    onToggle={() => toggleFeature(feature.id)}
                    bodyClassName="mt-1 px-[5px] lg:px-[15px]"
                    header={
                      <>
                        <p className={`font-semibold ${feature.fromSubclass ? 'text-ember' : 'text-stone-100'}`}>
                          {feature.name}
                        </p>
                        {feature.level != null && (
                          <Badge tone="accent">{ruLevel(feature.level)}</Badge>
                        )}
                        {(feature.ability_increases ?? []).length > 0 && (
                          <Badge tone="good">Изменения характеристик</Badge>
                        )}
                        {feature.fromSubclass && feature.subclassName && (
                          <Badge tone="accent">Подкласс: {feature.subclassName}</Badge>
                        )}
                      </>
                    }
                  >
                    {feature.description && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                        {feature.description}
                      </p>
                    )}
                    {(feature.ability_increases ?? []).length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {(feature.ability_increases ?? []).map((inc, i) => (
                          <Badge key={i} tone="good">
                            {abilityName(inc.ability)}
                            {inc.amount > 0 ? ` +${inc.amount}` : ` ${inc.amount}`}
                            {inc.new_cap != null && ` (макс. ${inc.new_cap})`}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </AccordionItem>
                </li>
              )
            })}
          </ul>
        )}
      </Section>
    </Card>
  )
}
