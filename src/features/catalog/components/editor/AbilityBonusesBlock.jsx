import { useState } from 'react'
import { abilityLabels } from '@/lib/i18n/index.js'
import EditorAddButton from './EditorAddButton.jsx'
import EffectGroupModal from './EffectGroupModal.jsx'
import { SectionTitle } from './editorShared.jsx'

const signed = (n) => (n > 0 ? `+${n}` : String(n))

// Бонусы характеристик расы/подрасы ({ ability, bonus }) — как статичный эффект «Изменение
// характеристик»: список «Сила +2», а правка и выбор — в той же панели справа (EffectGroupModal,
// экран выбора характеристики), без «нового максимума» (у бонуса расы его нет).
// owner — чьи бонусы («раса «Эльф»»): дописывается в шапку панели.
export default function AbilityBonusesBlock({ value = [], onChange, label = 'Бонусы характеристик', owner }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <SectionTitle
        button={value.length === 0
          ? <EditorAddButton onClick={() => setOpen(true)} aria-label="Добавить бонус">Добавить</EditorAddButton>
          : <button type="button" className="catalog-add-button" onClick={() => setOpen(true)} aria-label="Изменить бонусы">Изменить</button>}
      >
        {label} <span className="text-stone-500">{value.length}</span>
      </SectionTitle>
      {value.length === 0 ? (
        <p className="text-sm text-stone-500">Бонусов нет</p>
      ) : (
        // Как таблицы листа персонажа («Класс доспеха»): одна таблица «Характеристика | Бонус».
        <div className="overflow-hidden rounded-lg border border-stone-800">
          <table className="sheet-table combat-table w-full table-fixed" aria-label={label}>
            <thead>
              <tr>
                <th scope="col" className="w-1/2">Характеристика</th>
                <th scope="col" className="w-1/2">Бонус</th>
              </tr>
            </thead>
            <tbody>
              {value.map((row) => (
                <tr key={row.ability}>
                  <td className="text-stone-200">{abilityLabels[row.ability] ?? row.ability}</td>
                  <td className="tabular-nums text-stone-400">{signed(row.bonus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <EffectGroupModal
          drawer
          mode="static"
          effectType="ability_effects"
          allowEmpty
          title={owner ? `Изменение характеристик: ${owner}` : undefined}
          editorProps={{ withCap: false, sectionTitle: label }}
          initialRows={value.map((row) => ({ ability: row.ability, amount: row.bonus, new_cap: null }))}
          onSave={(_, rows) => {
            onChange(rows.map((row) => ({ ability: row.ability, bonus: row.amount })))
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
