import EditorAddButton from './EditorAddButton.jsx'
import { useState } from 'react'
import {
  abilityLabels,
  armorProficiencyLabels,
  skillEffectModeSuffix,
  weaponProficiencyLabels,
} from '@/lib/i18n/index.js'
import { inferGroupEffectType, normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { useItemNames, useSkills, useSpellNames } from '@/features/catalog/queries.js'
import { describeOpenSpell } from '@/lib/utils/spellFilter.js'
import { describeArmorClassEffect, describeSpeedEffect, describeToolEffect } from '@/lib/utils/effectBundle.js'
import { EFFECT_TYPES } from './effectTypeEditors.jsx'
import { SectionTitle, GroupRow } from './editorShared.jsx'
import EffectGroupModal from './EffectGroupModal.jsx'
import EffectsSummary from './EffectsSummary.jsx'

// Человекочитаемая метка одной строки эффекта — используется только для
// read-only просмотра внутри аккордеона (сама правка — только через модалку).
function rowLabel(key, row, { skillNames, spellNames, itemNames }) {
  switch (key) {
    case 'ability_effects': {
      const name = row.ability == null ? 'Любая характеристика' : abilityLabels[row.ability] ?? row.ability
      const amount = row.amount
      const suffix = amount != null ? ` ${amount > 0 ? '+' : ''}${amount}` : ''
      const cap = row.new_cap != null ? ` (макс. ${row.new_cap})` : ''
      return `${name}${suffix}${cap}`
    }
    case 'skill_effects': {
      const name =
        row.skill_id == null ? 'Любой навык на выбор' : (skillNames[row.skill_id] ?? `навык #${row.skill_id}`)
      return `${name}${skillEffectModeSuffix[row.mode] ?? ''}`
    }
    case 'saving_throw_effects':
      return row.ability == null ? 'Любой спасбросок' : abilityLabels[row.ability] ?? row.ability
    case 'armor_effects':
      return row.item_id != null
        ? (itemNames[row.item_id] ?? `доспех #${row.item_id}`)
        : (armorProficiencyLabels[row.armor_type] ?? row.armor_type)
    case 'weapon_effects':
      return row.item_id != null
        ? (itemNames[row.item_id] ?? `оружие #${row.item_id}`)
        : (weaponProficiencyLabels[row.weapon_category] ?? row.weapon_category)
    case 'spell_effects':
      if (row.spell_id == null) return describeOpenSpell(row)
      return spellNames[row.spell_id] ?? `заклинание #${row.spell_id}`
    case 'tool_effects':
      return describeToolEffect(row, itemNames)
    case 'speed_effects':
      return describeSpeedEffect(row)
    case 'armor_class_effects':
      return describeArmorClassEffect(row)
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

// part — только одна половина (вкладки «Статичные эффекты» / «Выбор эффектов»):
// 'static' | 'choice'; без part — обе. summaryHtml — effects_summary с бэка: вверху
// вкладки — превью своей части описания (splitEffectsSummary).
export default function FeatureEffectsEditor({ value, onChange, inline = false, drawer = false, onNavigate, part = null, summaryHtml = '' }) {
  const showStatic = part !== 'choice'
  const showChoice = part !== 'static'
  const summary = part && summaryHtml ? <EffectsSummary html={summaryHtml} part={part} /> : null
  // Заголовок раздела слева, кнопка добавления справа — одной строкой.
  const sectionHead = (title, button) => <SectionTitle button={button}>{title}</SectionTitle>
  const tree = normalizeEffectsTree(value)
  const groups = tree.choice_groups
  const [modal, setModal] = useState(null) // { mode: 'static'|'choice', effectType, groupIndex? } | null
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const { data: skillsCatalog = [] } = useSkills()
  const allSpellIds = [
    ...tree.spell_effects,
    ...groups.flatMap((g) => (g.options ?? []).flatMap((o) => o.spell_effects ?? [])),
  ].map((r) => r.spell_id)
  const skillNames = Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name]))
  const spellNames = useSpellNames(allSpellIds)
  const allItemIds = [
    ...tree.weapon_effects,
    ...tree.armor_effects,
    ...tree.tool_effects,
    ...groups.flatMap((g) =>
      (g.options ?? []).flatMap((o) => [...(o.weapon_effects ?? []), ...(o.armor_effects ?? []), ...(o.tool_effects ?? [])]),
    ),
  ].map((r) => r.item_id)
  const itemNames = useItemNames(allItemIds)
  const names = { skillNames, spellNames, itemNames }

  const usedStaticTypes = new Set(EFFECT_TYPES.filter((t) => tree[t.key].length > 0).map((t) => t.key))
  const usedGroupTypes = new Set(groups.map((g) => inferGroupEffectType(g)))

  const availableTypesFor = (used, mode) => EFFECT_TYPES.filter((t) => !used.has(t.key) && !(mode === 'choice' && t.staticOnly))

  const toggleOpen = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const removeStatic = (key) => onChange({ ...tree, [key]: [] })
  const removeGroup = (gi) => onChange({ ...tree, choice_groups: groups.filter((_, j) => j !== gi) })

  const openModal = (next) => { setModal(next); onNavigate?.(true) }
  const closeModal = () => { setModal(null); onNavigate?.(false) }

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

  if (inline && modal) return <EffectGroupModal
    summary={summary}
    inline
    mode={modal.mode}
    effectType={modal.effectType}
    availableTypes={availableTypesFor(modal.mode === 'static' ? usedStaticTypes : usedGroupTypes, modal.mode)}
    initialRows={modal.effectType ? tree[modal.effectType] : []}
    initialGroup={modal.groupIndex != null ? groups[modal.groupIndex] : null}
    onSave={modal.mode === 'static' ? saveStatic : saveGroup}
    onClose={closeModal}
  />

  return (
    <div className="space-y-4 pb-6">
      {summary}
      {showStatic && <div>
        {sectionHead('Статичные эффекты', (
          <EditorAddButton onClick={() => openModal({ mode: 'static', effectType: null })} aria-label="Добавить статичный эффект">
            Добавить
          </EditorAddButton>
        ))}
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
                  onEdit={() => openModal({ mode: 'static', effectType: t.key })}
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
      </div>}

      {showChoice && <div>
        {sectionHead('Выбор эффектов', (
          <EditorAddButton onClick={() => openModal({ mode: 'choice', effectType: null, groupIndex: null })} aria-label="Добавить выбор эффектов">
            Добавить
          </EditorAddButton>
        ))}
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
                  onEdit={() => openModal({ mode: 'choice', effectType, groupIndex: gi })}
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
      </div>}

      {modal?.mode === 'static' && (
        <EffectGroupModal
          drawer={drawer}
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
          drawer={drawer}
          mode="choice"
          effectType={modal.effectType}
          availableTypes={availableTypesFor(usedGroupTypes, 'choice')}
          initialGroup={modal.groupIndex != null ? groups[modal.groupIndex] : null}
          onSave={saveGroup}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
