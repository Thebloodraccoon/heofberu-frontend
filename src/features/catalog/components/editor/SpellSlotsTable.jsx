import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui'
import { SPELL_LEVEL_KEYS } from '@/features/catalog/config/editors/shared.js'
import { LEVELS, PRESETS, SLOT_KEYS, applySlotPreset, setSlotCell, slotCell as cell } from '@/lib/utils/spellSlots.js'
import { BlurNumberInput, SectionTitle } from './editorShared.jsx'

// Ячейки заклинаний: сразу все 20 уровней; клетка, равная прошлому уровню, бледная
// (унаследована) — менять нужно только там, где число растёт. Уменьшение не запрещено
// (у колдуна ячейки «переезжают» в круг выше), но подсвечено.
export default function SpellSlotsTable({ label, value = {}, onChange }) {
  const [preset, setPreset] = useState(null)
  const hasAny = LEVELS.some((level) => SLOT_KEYS.some((k) => cell(value, level, k) > 0))

  return (
    <div>
      <SectionTitle>{label}</SectionTitle>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-400">
        <span>Заполнить по шаблону:</span>
        {PRESETS.map(([name, rows]) => (
          <button key={name} type="button" className="catalog-filter-chip" onClick={() => (hasAny ? setPreset([name, rows]) : onChange(applySlotPreset(value, rows)))}>
            {name}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs text-stone-500">Пустая клетка — как на прошлом уровне (бледное число). Меняйте только там, где ячеек становится больше.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-10 border border-stone-700 bg-stone-900/50 px-2 py-1 text-left text-xs font-semibold text-stone-400">Ур.</th>
              <th className="border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm font-semibold text-stone-400">Заговоры</th>
              {SLOT_KEYS.map((k, i) => (
                <th key={k} className="border border-stone-700 bg-stone-900/50 px-3 py-1.5 text-sm font-semibold text-stone-400">{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((level) => (
              <tr key={level}>
                <td className="border border-stone-700 px-3 py-1.5 text-sm font-medium text-stone-300">{level}</td>
                {SPELL_LEVEL_KEYS.map((key) => {
                  const own = cell(value, level, key)
                  const prev = level > 1 ? cell(value, level - 1, key) : 0
                  const inherited = own === prev
                  const lower = own < prev
                  return (
                    <td key={key} className="border border-stone-700 p-1">
                      <BlurNumberInput
                        min={0}
                        max={9}
                        value={inherited ? '' : own}
                        placeholder={inherited && own > 0 ? String(own) : ''}
                        onChange={(v) => onChange(setSlotCell(value, level, key, v))}
                        aria-label={`Уровень ${level}, ${key === 'CANTRIP' ? 'заговоры' : `${SLOT_KEYS.indexOf(key) + 1} круг`}`}
                        title={lower ? 'Меньше, чем на прошлом уровне' : undefined}
                        inputMode="numeric"
                        className={`input-no-steppers w-full rounded border bg-stone-800/70 px-1 py-0.5 text-center text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-ember ${lower ? 'border-red-500/70' : 'border-stone-700'}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preset && (
        <ConfirmDialog
          title="Заполнить по шаблону?"
          message={<>Ячейки 1–9 кругов на всех уровнях заменятся шаблоном «{preset[0]}». Заговоры останутся как есть.</>}
          confirmText="Заполнить"
          onCancel={() => setPreset(null)}
          onConfirm={() => {
            onChange(applySlotPreset(value, preset[1]))
            setPreset(null)
          }}
        />
      )}
    </div>
  )
}
