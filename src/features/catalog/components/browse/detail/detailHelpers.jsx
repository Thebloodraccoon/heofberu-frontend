/* eslint-disable react-refresh/only-export-components */
import {
  abilityLabels,
  classSlugLabels,
  diceTypeLabels,
  fieldLabel,
  label,
  raceSizeLabels,
  ruLevel,
} from '@/lib/i18n/index.js'
import { Badge, Chip } from '@/components/ui'

export const skipFields = new Set([
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

export function isEmptyValue(value) {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'boolean') return false
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function itemName(value) {
  if (value && typeof value === 'object') return value.name ?? value.key ?? value.slug
  return value
}

export function spellLevel(value) {
  if (!value) return ''
  if (value === 'CANTRIP') return 'Заговор'
  const num = value.split('_')[1]
  return num ? `${num} уровень` : value
}

export function renderValue(value) {
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

export function summaryBadges(item) {
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

export function FieldValue({ value }) {
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
          return <Chip key={i} className="my-[5px]">{text}</Chip>
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

export function Section({ title, children }) {
  return (
    <div className="mb-[5px] mt-6 border-t border-stone-700/70 pt-4">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">{title}</h2>
      {children}
    </div>
  )
}

export function FeatureCards({ features }) {
  if (!features || features.length === 0) {
    return <p className="text-sm text-stone-500">Особенностей не указано</p>
  }
  return (
    <ul className="space-y-3">
      {features.map((f) => (
        <li key={f.id} className="my-[5px] rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-stone-100">{f.name}</p>
            {f.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(f.level)}</Badge>}
          </div>
          {f.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">{f.description}</p>}
        </li>
      ))}
    </ul>
  )
}
