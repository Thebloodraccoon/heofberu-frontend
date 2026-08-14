import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/endpoints.js'
import { catalog } from '../catalog.js'
import { abilityLabels, classSlugLabels, diceTypeLabels, fieldLabel, label, raceSizeLabels, ruLevel, skillLabels } from '../labels.js'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui.jsx'
import ClassDetailCard from '../components/ClassDetailCard.jsx'

const skipFields = new Set([
  'id',
  'name',
  'key',
  'is_homebrew',
  'created_by_id',
  'updated_at',
  'image_path',
  'description',
  'higher_levels',
  'features',
])

function isEmptyValue(value) {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'boolean') return false
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function itemName(value) {
  if (value && typeof value === 'object') return value.name ?? value.key ?? value.slug
  return value
}

function spellLevel(value) {
  if (!value) return ''
  if (value === 'CANTRIP') return 'Заговор'
  const num = value.split('_')[1]
  return num ? `${num} уровень` : value
}

function renderValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    const names = value.map((item) => {
      if (item && typeof item === 'object') return item.name ?? item.spell_level ?? item.ability ?? label(item)
      return label(item)
    })
    return names.join(', ')
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${fieldLabel(k)}: ${renderValue(v)}`)
      .join('; ')
  }
  return label(value)
}

function summaryBadges(item) {
  const badges = []
  if (item.level != null && item.level !== '') {
    badges.push({
      text: typeof item.level === 'number' ? ruLevel(item.level) : spellLevel(item.level),
      tone: 'accent',
    })
  }
  if (item.school) badges.push({ text: label(item.school), tone: 'default' })
  if (item.rarity && item.rarity !== 'NONE') {
    const rare =
      item.rarity === 'RARE' ||
      item.rarity === 'VERY_RARE' ||
      item.rarity === 'LEGENDARY' ||
      item.rarity === 'ARTIFACT'
    badges.push({ text: label(item.rarity), tone: rare ? 'accent' : 'default' })
  }
  if (item.item_type) badges.push({ text: label(item.item_type), tone: 'default' })
  if (item.size) badges.push({ text: raceSizeLabels[item.size] ?? label(item.size), tone: 'default' })
  if (item.hit_dice) badges.push({ text: `Кость хитов ${diceTypeLabels[item.hit_dice] ?? item.hit_dice}`, tone: 'default' })
  if (item.source_type) badges.push({ text: label(item.source_type), tone: 'default' })
  if (item.ability) badges.push({ text: label(item.ability), tone: 'default' })
  if (item.armor_class) badges.push({ text: `КД ${item.armor_class}`, tone: 'default' })
  if (item.attack_type) badges.push({ text: label(item.attack_type), tone: 'default' })
  if (item.damage_type) badges.push({ text: label(item.damage_type), tone: 'default' })
  if (item.dice_count && item.dice_type) {
    badges.push({ text: `${item.dice_count}${diceTypeLabels[item.dice_type] ?? item.dice_type}`, tone: 'default' })
  }
  if (item.spell_cast_time) badges.push({ text: label(item.spell_cast_time), tone: 'default' })
  if (item.spell_range_type) {
    const v = item.spell_range_value
    badges.push({
      text: v != null && v !== '' ? `${label(item.spell_range_type)}, ${v} фт.` : label(item.spell_range_type),
      tone: 'default',
    })
  }
  if (item.spell_duration) badges.push({ text: label(item.spell_duration), tone: 'default' })
  if (item.spell_concentration) badges.push({ text: 'Концентрация', tone: 'accent' })
  if (item.spell_ritual) badges.push({ text: 'Ритуал', tone: 'accent' })
  if (item.cast_time) badges.push({ text: label(item.cast_time), tone: 'default' })
  if (item.range_type) {
    const v = item.range_value
    badges.push({
      text: v != null && v !== '' ? `${label(item.range_type)}, ${v} фт.` : label(item.range_type),
      tone: 'default',
    })
  }
  if (item.duration) badges.push({ text: label(item.duration), tone: 'default' })
  if (item.is_concentration) badges.push({ text: 'Концентрация', tone: 'accent' })
  if (item.is_ritual) badges.push({ text: 'Ритуал', tone: 'accent' })
  if (item.available_classes && item.available_classes.length > 0) {
    badges.push({
      text: item.available_classes.map((c) => classSlugLabels[itemName(c)] ?? label(itemName(c))).join(', '),
      tone: 'default',
    })
  }
  if (item.prerequisite) {
    const text = Array.isArray(item.prerequisite)
      ? item.prerequisite
          .map((p) => (p && typeof p === 'object' ? (p.name ?? label(p)) : label(p)))
          .join(', ')
      : label(item.prerequisite)
    badges.push({ text: `Треб: ${text}`, tone: 'default' })
  }
  return badges
}

function Chip({ children }) {
  return (
    <span className="inline-block rounded border border-stone-700 bg-stone-800/80 px-2 py-0.5 text-xs text-stone-200">
      {children}
    </span>
  )
}

function FieldValue({ value }) {
  if (value === null || value === undefined || value === '') return <span className="text-stone-500">—</span>
  if (typeof value === 'boolean') return <span className="text-stone-200">{value ? 'Да' : 'Нет'}</span>
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-stone-500">—</span>
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((item, i) => {
          const text =
            item && typeof item === 'object'
              ? (item.name ??
                (item.ability && (item.bonus ?? item.amount) != null
                  ? `${abilityLabels[item.ability] ?? item.ability} +${item.bonus ?? item.amount}`
                  : item.spell_level ??
                    item.ability ??
                    label(item)))
              : label(item)
          return <Chip key={i}>{text}</Chip>
        })}
      </span>
    )
  }
  if (typeof value === 'object') {
    return (
      <span className="text-stone-200">
        {Object.entries(value)
          .map(([k, v]) => `${fieldLabel(k)}: ${renderValue(v)}`)
          .join('; ')}
      </span>
    )
  }
  return <span className="text-stone-200">{label(value)}</span>
}

function filterLabel(field, value) {
  if (field === 'level') return spellLevel(value)
  if (field === 'size') return raceSizeLabels[value] ?? label(value)
  if (field === 'is_concentration' || field === 'is_ritual') return value === 'true' ? 'Да' : 'Нет'
  return label(value)
}

function FilterModal({ fields, options, value, onChange, onClose }) {
  const toggle = (field, v) => {
    const cur = value[field] ?? []
    onChange({ ...value, [field]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div
        className="mx-auto mt-8 w-full max-w-md rounded-lg bg-stone-900 p-5 shadow-2xl ring-1 ring-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Фильтр</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-stone-700 px-2 py-1 text-sm text-stone-300 transition hover:bg-stone-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {fields.length === 0 && <p className="text-sm text-stone-500">Фильтров нет</p>}
          {fields.map((field) => (
            <section key={field}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                {fieldLabel(field)}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(options[field] ?? []).map((v) => {
                  const active = (value[field] ?? []).includes(v)
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggle(field, v)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                        active ? 'bg-ember text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      {filterLabel(field, v)}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">Фильтры применяются автоматически!</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mt-6 border-t border-stone-700/70 pt-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </div>
  )
}

function FeatureCards({ features }) {
  if (!features || features.length === 0) {
    return <p className="text-sm text-stone-500">Особенностей не указано</p>
  }
  return (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-100">{f.name}</p>
            {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
          </div>
          {f.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{f.description}</p>}
        </li>
      ))}
    </ul>
  )
}

function RaceDetailCard({ race, selectedSub }) {
  const raceFeatures = (race.features ?? []).map((f) => ({ ...f, fromSubrace: false }))
  const subFeatures = selectedSub
    ? (selectedSub.features ?? []).map((f) => ({
        ...f,
        fromSubrace: true,
        subraceName: selectedSub.name,
      }))
    : []
  const features = [...raceFeatures, ...subFeatures]

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{race.name}</h1>
        {selectedSub && (
          <p className="font-display text-lg font-semibold text-ember">{selectedSub.name}</p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        <Badge>Размер: {raceSizeLabels[race.size] ?? race.size}</Badge>
        <Badge>Скорость: {race.speed} фт.</Badge>
      </div>

      {selectedSub
        ? selectedSub.description && (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
              {selectedSub.description}
            </p>
          )
        : race.description && (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
              {race.description}
            </p>
          )}

      {selectedSub
        ? selectedSub.ability_bonuses && selectedSub.ability_bonuses.length > 0 && (
            <Section title="Бонусы характеристик">
              <div className="flex flex-wrap gap-1.5">
                {selectedSub.ability_bonuses.map((b, i) => (
                  <span key={i} className="rounded bg-stone-800 px-2.5 py-1 text-xs text-stone-200">
                    {abilityLabels[b.ability] ?? b.ability} +{b.bonus}
                  </span>
                ))}
              </div>
            </Section>
          )
        : race.ability_bonuses && race.ability_bonuses.length > 0 && (
            <Section title="Бонусы характеристик">
              <div className="flex flex-wrap gap-1.5">
                {race.ability_bonuses.map((b, i) => (
                  <span key={i} className="rounded bg-stone-800 px-2.5 py-1 text-xs text-stone-200">
                    {abilityLabels[b.ability] ?? b.ability} +{b.bonus}
                  </span>
                ))}
              </div>
            </Section>
          )}

      {race.granted_skills && race.granted_skills.length > 0 && (
        <Section title="Навыки расы">
          <div className="flex flex-wrap gap-1.5">
            {race.granted_skills.map((s) => (
              <Badge key={s.id}>{s.name}</Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title="Особенности и умения">
        {features.length === 0 ? (
          <p className="text-sm text-stone-500">Особенностей не указано</p>
        ) : (
          <ul className="space-y-3">
            {features.map((feature) => (
              <li
                key={feature.id}
                className={`rounded-lg border p-3 ${
                  feature.fromSubrace
                    ? 'border-ember/60 bg-ember/5'
                    : 'border-stone-700/60 bg-stone-900/60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-semibold ${feature.fromSubrace ? 'text-ember' : 'text-stone-100'}`}>
                    {feature.name}
                  </p>
                  {feature.level != null && <Badge tone="accent">{ruLevel(feature.level)}</Badge>}
                  {feature.fromSubrace && feature.subraceName && (
                    <Badge tone="accent">Подраса: {feature.subraceName}</Badge>
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

function GenericDetail({ item, hideAbility = false }) {
  const rows = Object.entries(item).filter(
    ([k]) => !skipFields.has(k) && !k.endsWith('_id') && !(hideAbility && k === 'ability')
  )
  const visible = rows.filter(([, v]) => !isEmptyValue(v))
  const badges = summaryBadges(item)

  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
      </div>

      {badges.length > 0 && (
        <div className="mb-6 flex flex-wrap justify-center gap-1.5">
          {badges.map((b, i) => (
            <Badge key={i} tone={b.tone}>{b.text}</Badge>
          ))}
        </div>
      )}

      {item.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {item.description}
        </p>
      )}

      {visible.length > 0 && (
        <FactGrid>
          {visible.map(([k, v]) => (
            <FactCell key={k} label={fieldLabel(k)} value={<FieldValue value={v} />} />
          ))}
        </FactGrid>
      )}

      {item.higher_levels && (
        <Section title="На более высоких уровнях">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{item.higher_levels}</p>
        </Section>
      )}

      {item.features && item.features.length > 0 && (
        <Section title="Особенности">
          <FeatureCards features={item.features} />
        </Section>
      )}
    </Card>
  )
}

function FeatureDetailCard({ item }) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{item.name}</h1>
        <div className="flex flex-wrap justify-center gap-1.5">
          {item.level != null && <Badge tone="accent">{ruLevel(item.level)}</Badge>}
        </div>
      </div>

      {item.description ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{item.description}</p>
      ) : (
        <p className="text-sm text-stone-500">Описание не указано</p>
      )}
    </Card>
  )
}

function StatTable({ rows }) {
  if (!rows || rows.length === 0) return null
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-stone-700/40 align-top last:border-b-0">
            <th className="w-2/5 px-3 py-2.5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
              {k}
            </th>
            <td className="px-3 py-2.5 text-stone-200">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FactGrid({ children }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-700/60 bg-stone-700/60">
      {children}
    </div>
  )
}

function FactCell({ label: lbl, value }) {
  return (
    <div className="bg-stone-900/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{lbl}</p>
      <div className="mt-1 text-sm text-stone-200">{value}</div>
    </div>
  )
}

const COMPONENT_FULL = { VERBAL: 'Вербальный', SOMATIC: 'Соматический', MATERIAL: 'Материальный' }

function SpellDetailCard({ spell }) {
  const components = (spell.components ?? [])
    .map((c) => COMPONENT_FULL[c] ?? label(c))
    .join(', ')
  const classes = (spell.available_classes ?? [])
    .map((c) => classSlugLabels[itemName(c)] ?? label(itemName(c)))
    .join(', ')
  const races = (spell.available_races ?? [])
    .map((c) => label(itemName(c)))
    .join(', ')

  const rangeText =
    spell.range_value != null && spell.range_value !== ''
      ? `${spell.range_value} футов`
      : spell.range_type
        ? label(spell.range_type)
        : null
  const durationText = spell.duration
    ? spell.is_concentration
      ? `Концентрация, вплоть до ${label(spell.duration)}`
      : label(spell.duration)
    : null
  const componentsText =
    spell.components && spell.components.length > 0
      ? spell.components.includes('MATERIAL') && spell.material
        ? `${components} (${spell.material})`
        : components
      : null

  const damageText =
    spell.damage_dice_count && spell.damage_dice_type
      ? `${spell.damage_dice_count}${diceTypeLabels[spell.damage_dice_type] ?? spell.damage_dice_type}${
          spell.damage_type ? ` ${label(spell.damage_type)}` : ''
        }`.trim()
      : null
  const healingText =
    spell.healing_dice_count && spell.healing_dice_type
      ? `${spell.healing_dice_count}${diceTypeLabels[spell.healing_dice_type] ?? spell.healing_dice_type}${
          spell.healing_target ? ` ${label(spell.healing_target)}` : ''
        }`.trim()
      : null

  return (
    <Card className="p-6">
      <div className="mb-2 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{spell.name}</h1>
        <div className="flex flex-wrap justify-center gap-1.5">
          {spell.level && <Badge tone="accent">{spellLevel(spell.level)}</Badge>}
          {spell.school && <Badge>{label(spell.school)}</Badge>}
          {spell.is_ritual && <Badge>Ритуал</Badge>}
        </div>
        {spell.source && <p className="text-xs text-stone-500">Источник: {spell.source}</p>}
      </div>

      <FactGrid>
        {spell.cast_time && <FactCell label="Время накладывания" value={label(spell.cast_time)} />}
        {rangeText && <FactCell label="Дистанция" value={rangeText} />}
        {durationText && <FactCell label="Длительность" value={durationText} />}
        {componentsText && <FactCell label="Компоненты" value={componentsText} />}
        {damageText && <FactCell label="Урон" value={damageText} />}
        {healingText && <FactCell label="Лечение" value={healingText} />}
      </FactGrid>

      {spell.description && (
        <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">
          {spell.description}
        </p>
      )}

      {spell.higher_levels && (
        <Section title="На более высоких уровнях">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{spell.higher_levels}</p>
        </Section>
      )}

      {(classes || races) && (
        <Section title="Доступность">
          <div className="space-y-1 text-sm text-stone-300">
            {classes && (
              <p>
                <span className="font-medium text-stone-200">Классы: </span>
                {classes}
              </p>
            )}
            {races && (
              <p>
                <span className="font-medium text-stone-200">Доступно расам: </span>
                {races}
              </p>
            )}
          </div>
        </Section>
      )}
    </Card>
  )
}

function BackgroundDetailCard({ bg }) {
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
    <Card className="p-6">
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-2xl font-bold text-stone-100">{bg.name}</h1>
      </div>

      {bg.description && (
        <p className="mb-6 whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
          {bg.description}
        </p>
      )}

      {skills.length > 0 && (
        <Section title="Владение навыками">
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <Badge key={i}>{skillText(s)}</Badge>
            ))}
          </div>
        </Section>
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
              <div key={key} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
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

function TileCard({ item, resource }) {
  return (
    <Link
      to={`/catalog/${resource}/${item.id}`}
      className="group fantasy-panel rounded-lg p-5 transition hover:border-ember/70"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-base font-bold text-stone-100 group-hover:text-ember">
          {item.name}
        </p>
      </div>
      {item.description && (
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-stone-400">{item.description}</p>
      )}
      {summaryBadges(item).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summaryBadges(item).map((b, i) => (
            <Badge key={i} tone={b.tone}>{b.text}</Badge>
          ))}
        </div>
      )}
    </Link>
  )
}

function DetailPanel({ resource, item, selectedSubId }) {
  if (resource === 'races') {
    const sub = selectedSubId
      ? (item.subraces ?? []).find((s) => String(s.id) === String(selectedSubId))
      : null
    return <RaceDetailCard race={item} selectedSub={sub} />
  }
  if (resource === 'classes') return <ClassDetailCard cls={item} selectedSubId={selectedSubId} />
  if (resource === 'spells') return <SpellDetailCard spell={item} />
  if (resource === 'backgrounds') return <BackgroundDetailCard bg={item} />
  if (resource === 'features') return <FeatureDetailCard item={item} />
  return <GenericDetail item={item} hideAbility={resource === 'skills'} />
}

export function CatalogListPage() {
  const { resource, id } = useParams()
  const navigate = useNavigate()
  const cfg = catalog[resource]
  const filterFields = useMemo(() => cfg.filters ?? [], [cfg])

  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const page = await cfg.api.list({ size: 100, ...(cfg.listParams ?? {}) })
        if (!active) return
        setError(null)
        setItems(page.items ?? [])
      } catch (e) {
        if (active) setError(e)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [cfg, reloadKey])

  const filterOptions = useMemo(() => {
    if (!items) return {}
    const opts = {}
    for (const field of filterFields) {
      const values = new Set()
      for (const it of items) {
        const v = it[field]
        if (Array.isArray(v)) {
          for (const x of v) if (x != null && x !== '') values.add(String(x))
        } else if (v != null && v !== '') values.add(String(v))
      }
      opts[field] = Array.from(values).sort()
    }
    return opts
  }, [items, filterFields])

  const filtered = useMemo(() => {
    if (!items) return null
    return items.filter((it) => {
      for (const field of filterFields) {
        const sel = filters[field]
        if (!sel || sel.length === 0) continue
        const v = it[field]
        if (Array.isArray(v)) {
          if (!v.some((x) => sel.includes(String(x)))) return false
        } else if (!sel.includes(String(v))) return false
      }
      const q = query.trim().toLowerCase()
      if (!q) return true
      return Object.values(it)
        .filter((v) => typeof v === 'string')
        .some((v) => v.toLowerCase().includes(q))
    })
  }, [items, filters, query, filterFields])

  const selectedId = id ? Number(id) : null
  const [selected, setSelected] = useState(null)
  const [subSel, setSubSel] = useState({ parentId: null, id: null })
  const selectedSubId = subSel.parentId === selectedId ? subSel.id : null

  useEffect(() => {
    let active = true
    if (!selectedId) return () => { active = false }
    cfg.api
      .get(selectedId)
      .then(async (data) => {
        if (!active) return
        let withFeatures = data
        if (cfg.featuresApi) {
          try {
            const feats = await cfg.featuresApi(selectedId)
            withFeatures = { ...data, features: Array.isArray(feats) ? feats : feats?.features ?? [] }
          } catch {
            /* не критично для просмотра */
          }
        }
        if (resource === 'classes') {
          try {
            const subs = withFeatures.subclasses ?? []
            const withSubFeatures = await Promise.all(
              subs.map(async (sub) => {
                if (Array.isArray(sub.features)) return sub
                const feats = await api.classes.subclasses.features.list(selectedId, sub.id)
                return { ...sub, features: Array.isArray(feats) ? feats : feats?.features ?? [] }
              })
            )
            withFeatures = { ...withFeatures, subclasses: withSubFeatures }
          } catch {
            /* не критично для просмотра */
          }
        }
        if (resource === 'races') {
          try {
            const subs = withFeatures.subraces ?? []
            const withSubFeatures = await Promise.all(
              subs.map(async (sub) => {
                if (Array.isArray(sub.features) && sub.ability_bonuses) return sub
                const [detail, feats] = await Promise.all([
                  api.races.subraces.get(selectedId, sub.id),
                  api.races.subraces.features.list(selectedId, sub.id),
                ])
                return {
                  ...sub,
                  ...detail,
                  features: Array.isArray(feats) ? feats : feats?.features ?? [],
                }
              })
            )
            withFeatures = { ...withFeatures, subraces: withSubFeatures }
          } catch {
            /* не критично для просмотра */
          }
        }
        setSelected({ id: selectedId, data: withFeatures })
        setError(null)
      })
      .catch((e) => {
        if (active) setError(e)
      })
    return () => {
      active = false
    }
  }, [cfg, selectedId, resource, reloadKey])

  const activeCount = Object.values(filters).reduce((n, arr) => n + (arr?.length ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={cfg.label}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: имя, описание..."
              className="w-full rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember sm:w-64"
            />
            {filterFields.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="shrink-0 rounded border border-stone-700 bg-stone-800/70 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-800"
              >
                Фильтр{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <ErrorBox
          error={error}
          onRetry={() => {
            setError(null)
            setReloadKey((k) => k + 1)
          }}
        />
      )}
      {items === null && !error && <Spinner />}
      {items !== null && items.length === 0 && (
        <EmptyState text="Справочник пуст. Попросите ГМ наполнить его через npm run seed" />
      )}
      {items !== null && items.length > 0 && filtered.length === 0 && (
        <EmptyState text="Ничего не найдено по запросу" />
      )}

      {items && filtered && filtered.length > 0 && (
        selectedId ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <aside className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 lg:sticky lg:top-24">
              <Link
                to={`/catalog/${resource}`}
                className="mb-2 block text-xs text-ember hover:underline"
              >
                ← Ко всем записям
              </Link>
              <div className="flex flex-col gap-2">
                {filtered.map((it) => {
                  const isActive = Number(it.id) === selectedId
                  const activeSubs =
                    resource === 'classes'
                      ? it.subclasses ?? []
                      : isActive
                        ? selected?.data?.subraces ?? []
                        : []
                  return (
                    <div
                      key={it.id}
                      className={`w-full fantasy-panel rounded-lg p-4 transition ${
                        isActive
                          ? 'border-ember/80 bg-stone-900'
                          : 'hover:border-ember/50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/catalog/${resource}/${it.id}`)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-display text-sm font-bold ${isActive ? 'text-ember' : 'text-stone-100'}`}>
                            {it.name}
                          </p>
                        </div>
                        {it.description && (
                          <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-xs text-stone-400">{it.description}</p>
                        )}
                        {summaryBadges(it).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {summaryBadges(it).map((b, i) => (
                              <Badge key={i} tone={b.tone}>{b.text}</Badge>
                            ))}
                          </div>
                        )}
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                          isActive && (resource === 'classes' || resource === 'races') && activeSubs.length > 0
                            ? 'grid-rows-[1fr]'
                            : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          {(resource === 'classes' || resource === 'races') && (
                            <div className="mt-3 border-t border-stone-700/70 pt-2">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                {resource === 'races' ? 'Подрасы' : 'Подклассы'}
                              </p>
                              <div className="flex flex-col gap-1">
                                {activeSubs.map((sub) => {
                                  const isSubActive = String(selectedSubId) === String(sub.id)
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => setSubSel({ parentId: selectedId, id: isSubActive ? null : sub.id })}
                                      className={`rounded border px-2 py-1 text-left text-xs transition ${
                                        isSubActive
                                          ? 'border-ember bg-ember/10 text-ember'
                                          : 'border-stone-700 text-stone-300 hover:border-ember/50'
                                      }`}
                                    >
                                      {sub.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>

            <section className="min-w-0">
              {selected && selected.id === selectedId ? (
                <DetailPanel
                  key={`${resource}-${selectedId}`}
                  resource={resource}
                  item={selected.data}
                  selectedSubId={selectedSubId}
                />
              ) : (
                <Card className="p-10 text-center">
                  <Spinner />
                </Card>
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <TileCard key={it.id} item={it} resource={resource} />
            ))}
          </div>
        )
      )}

      {showFilters && (
        <FilterModal
          fields={filterFields}
          options={filterOptions}
          value={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}
