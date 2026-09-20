import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { catalogApi as api } from '@/features/catalog/api.js'
import { abilityLabels, armorProficiencyLabels, weaponProficiencyLabels } from '@/lib/i18n/index.js'
import { inferGroupEffectType, normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { useSpellNames } from '@/features/catalog/queries.js'
import { EFFECT_TYPES } from './effectTypeEditors.jsx'
import { SectionTitle, GroupRow } from './editorShared.jsx'
import EffectGroupModal from './EffectGroupModal.jsx'

// Человекочитаемая метка одной строки эффекта — используется только для
// read-only просмотра внутри аккордеона (сама правка — только через модалку).
function rowLabel(key, row, { skillNames, spellNames }) {
  switch (key) {
    case 'ability_effects': {
      const name = abilityLabels[row.ability] ?? row.ability
      const amount = row.amount
      const suffix = amount != null ? ` ${amount > 0 ? '+' : ''}${amount}` : ''
      const cap = row.new_cap != null ? ` (макс. ${row.new_cap})` : ''
      return `${name}${suffix}${cap}`
    }
    case 'skill_effects': {
      const name = skillNames[row.skill_id] ?? `навык #${row.skill_id}`
      return row.grants_expertise ? `${name} (экспертиза)` : name
    }
    case 'saving_throw_effects':
      return abilityLabels[row.ability] ?? row.ability
    case 'armor_effects':
      return armorProficiencyLabels[row.armor_type] ?? row.armor_type
    case 'weapon_effects':
      return row.item_id != null
        ? (row.itemName ?? `предмет #${row.item_id}`)
        : (weaponProficiencyLabels[row.weapon_category] ?? row.weapon_category)
    case 'spell_effects':
      return spellNames[row.spell_id] ?? `заклинание #${row.spell_id}`
    default:
      return ''
  }
}

const pluralOption = (n) => {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'вариант'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'варианта'
  return 'вариантов'
}

export default function FeatureEffectsEditor({ value, onChange }) {
  const tree = normalizeEffectsTree(value)
  const groups = tree.choice_groups
  const [modal, setModal] = useState(null) // { mode: 'static'|'choice', effectType, groupIndex? } | null
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const skillsQ = useQuery({
    queryKey: ['catalog', 'skills', 'all'],
    queryFn: () => api.skills.list({ size: 100 }),
  })
  const allSpellIds = [
    ...tree.spell_effects,
    ...groups.flatMap((g) => (g.options ?? []).flatMap((o) => o.spell_effects ?? [])),
  ].map((r) => r.spell_id)
  const skillNames = Object.fromEntries((skillsQ.data?.items ?? []).map((s) => [s.id, s.name]))
  const spellNames = useSpellNames(allSpellIds)
  const names = { skillNames, spellNames }

  const usedStaticTypes = new Set(EFFECT_TYPES.filter((t) => tree[t.key].length > 0).map((t) => t.key))
  const usedGroupTypes = new Set(groups.map((g) => inferGroupEffectType(g)))

  const availableTypesFor = (used) => EFFECT_TYPES.filter((t) => !used.has(t.key))

  const toggleOpen = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const removeStatic = (key) => onChange({ ...tree, [key]: [] })
  const removeGroup = (gi) => onChange({ ...tree, choice_groups: groups.filter((_, j) => j !== gi) })

  const closeModal = () => setModal(null)

  const saveStatic = (effectType, rows) => {
    onChange({ ...tree, [effectType]: rows })
    closeModal()
  }
  const saveGroup = (effectType, group) => {
    const next =
      modal.groupIndex == null
        ? [...groups, group]
        : groups.map((g, j) => (j === modal.groupIndex ? group : g))
    onChange({ ...tree, choice_groups: next })
    closeModal()
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionTitle
          button={
            <button
              type="button"
              onClick={() => setModal({ mode: 'static', effectType: null })}
              className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
            >
              + Добавить статичный эффект
            </button>
          }
        >
          Статичные эффекты
        </SectionTitle>
        {usedStaticTypes.size === 0 ? (
          <p className="text-sm text-stone-500">Статичных эффектов нет — особенность применяется как есть.</p>
        ) : (
          <div className="space-y-2">
            {EFFECT_TYPES.filter((t) => usedStaticTypes.has(t.key)).map((t) => {
              const rows = tree[t.key]
              const key = `static:${t.key}`
              return (
                <GroupRow
                  key={t.key}
                  title={t.label}
                  count={rows.length}
                  open={openKeys.has(key)}
                  onToggle={() => toggleOpen(key)}
                  onEdit={() => setModal({ mode: 'static', effectType: t.key })}
                  onRemove={() => removeStatic(t.key)}
                >
                  <ul className="list-disc space-y-0.5 pl-5">
                    {rows.map((row, i) => (
                      <li key={i}>{rowLabel(t.key, row, names)}</li>
                    ))}
                  </ul>
                </GroupRow>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <SectionTitle
          button={
            <button
              type="button"
              onClick={() => setModal({ mode: 'choice', effectType: null, groupIndex: null })}
              className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
            >
              + Добавить выбор эффектов
            </button>
          }
        >
          Группы выбора
        </SectionTitle>
        <p className="pb-2 text-xs text-stone-500">
          Особенность выдаёт игроку выбор «N из M» по одному типу эффекта — для каждого типа эффекта может быть
          только одна группа выбора.
        </p>
        {groups.length === 0 ? (
          <p className="text-sm text-stone-500">Групп выбора нет — особенность применяется автоматически.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((group, gi) => {
              const effectType = inferGroupEffectType(group)
              const typeLabel = EFFECT_TYPES.find((t) => t.key === effectType)?.label ?? effectType
              const options = group.options ?? []
              const key = `choice:${gi}`
              return (
                <GroupRow
                  key={gi}
                  title={`${typeLabel} · выбрать ${group.pick_count ?? 1} из ${options.length} ${pluralOption(options.length)}`}
                  open={openKeys.has(key)}
                  onToggle={() => toggleOpen(key)}
                  onEdit={() => setModal({ mode: 'choice', effectType, groupIndex: gi })}
                  onRemove={() => removeGroup(gi)}
                >
                  <ul className="space-y-1">
                    {options.map((option, oi) => {
                      const rows = option[effectType] ?? []
                      return (
                        <li key={oi}>
                          <span className="text-stone-400">Вариант {oi + 1}:</span>{' '}
                          {rows.length > 0 ? rows.map((row) => rowLabel(effectType, row, names)).join(', ') : '—'}
                        </li>
                      )
                    })}
                  </ul>
                </GroupRow>
              )
            })}
          </div>
        )}
      </div>

      {modal?.mode === 'static' && (
        <EffectGroupModal
          mode="static"
          effectType={modal.effectType}
          availableTypes={availableTypesFor(usedStaticTypes)}
          initialRows={modal.effectType ? tree[modal.effectType] : []}
          onSave={saveStatic}
          onClose={closeModal}
        />
      )}
      {modal?.mode === 'choice' && (
        <EffectGroupModal
          mode="choice"
          effectType={modal.effectType}
          availableTypes={availableTypesFor(usedGroupTypes)}
          initialGroup={modal.groupIndex != null ? groups[modal.groupIndex] : null}
          onSave={saveGroup}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
