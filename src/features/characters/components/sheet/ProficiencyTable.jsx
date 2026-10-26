import { useCharacterProficiencies } from '@/features/characters/queries.js'
import { useItemNames, useSkills } from '@/features/catalog/queries.js'
import { SkeletonText } from '@/components/ui'
import { abilityLabels, armorProficiencyLabels, sentenceCase, skillLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'

const SOURCE_TYPE_LABELS = {
  CLASS: 'Класс',
  CLASS_CHOICE: 'Выбор класса',
  SUBCLASS: 'Подкласс',
  RACE: 'Раса',
  SUBRACE: 'Подраса',
  BACKGROUND: 'Предыстория',
  FEAT: 'Черта',
  FEATURE: 'Особенность',
  GM: 'Правки ГМа',
  OTHER: 'Особая',
}

const sourceLabel = (src) => {
  if (src?.source_type === 'FEATURE' && src.feature_name) return sentenceCase(src.feature_name.trim())
  return SOURCE_TYPE_LABELS[src?.source_type] ?? src?.source_type ?? '—'
}

function Table({ title, columnLabel, rows }) {
  if (rows.length === 0) return null
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">{title}</p>
      <div className="overflow-hidden rounded-lg border border-stone-800">
        <table className="sheet-table w-full table-fixed">
          <thead>
            <tr>
              <th className="w-1/2">{columnLabel}</th>
              <th className="w-1/2">Источник</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="text-stone-200">{r.name ?? <SkeletonText w="8rem" />}</td>
                <td className="text-stone-400">{r.sources.length > 0 ? r.sources.join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ProficiencyTable({ characterId }) {
  const { data: proficiencies } = useCharacterProficiencies(characterId)
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const skillsById = new Map(skillsCatalog.map((s) => [Number(s.id), s]))
  const itemNames = useItemNames(
    [...(proficiencies?.armor ?? []), ...(proficiencies?.weapons ?? []), ...(proficiencies?.tools ?? [])].map((p) => p.item_id),
  )

  const skillRows = (proficiencies?.skills ?? []).map((p) => {
    const sk = skillsById.get(Number(p.skill_id))
    // имя ещё не подгрузилось — null, в таблице скелетон вместо «Навык #id»
    const name = sk ? (skillLabels[sk.name] ?? sentenceCase(sk.name)) : null
    return {
      key: `skill-${p.skill_id}`,
      name: name != null && p.is_expertise ? `${name} (эксперт.)` : name,
      sources: (p.sources ?? []).map(sourceLabel),
    }
  })

  const saveRows = (proficiencies?.saving_throws ?? []).map((p) => ({
    key: `save-${p.ability}`,
    name: abilityLabels[p.ability] ?? p.ability,
    sources: (p.sources ?? []).map(sourceLabel),
  }))

  // Конкретный доспех/оружие (item_id) — по имени из справочника.
  const armorRows = (proficiencies?.armor ?? []).map((p) => ({
    key: `armor-${p.item_id != null ? `item-${p.item_id}` : p.armor_type}`,
    name:
      p.item_id != null
        ? (itemNames[p.item_id] ?? null)
        : (armorProficiencyLabels[p.armor_type] ?? p.armor_type),
    sources: (p.sources ?? []).map(sourceLabel),
  }))

  const weaponRows = (proficiencies?.weapons ?? []).map((p) => ({
    key: `weapon-${p.item_id != null ? `item-${p.item_id}` : p.weapon_category}`,
    name:
      p.item_id != null
        ? (itemNames[p.item_id] ?? null)
        : (weaponProficiencyLabels[p.weapon_category] ?? p.weapon_category),
    sources: (p.sources ?? []).map(sourceLabel),
  }))

  const toolRows = (proficiencies?.tools ?? []).map((p) => ({
    key: `tool-${p.item_id}`,
    name: itemNames[p.item_id] ?? null,
    sources: (p.sources ?? []).map(sourceLabel),
  }))

  if (skillRows.length === 0 && saveRows.length === 0 && armorRows.length === 0 && weaponRows.length === 0 && toolRows.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <Table title="Владение навыками" columnLabel="Навык" rows={skillRows} />
      <Table title="Владение спасбросками" columnLabel="Спасбросок" rows={saveRows} />
      <Table title="Владение доспехами" columnLabel="Доспехи" rows={armorRows} />
      <Table title="Владение оружием" columnLabel="Оружие" rows={weaponRows} />
      <Table title="Владение инструментами" columnLabel="Инструмент" rows={toolRows} />
    </div>
  )
}
