import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BoxedValue, RollButton } from '@/components/sheet/primitives.jsx'
import { Select } from '@/components/ui'
import RollHistory from '@/components/sheet/RollHistory.jsx'
import { useAuth } from '@/features/auth/useAuth.js'

const DICE = [4, 6, 8, 10, 12, 20, 100]

function DicePicker({ onRoll }) {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({})
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const qty = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-stone-300 transition hover:border-ember hover:text-ember"
        title="Свободный бросок кубиков"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <path d="M8 8h.01" /><path d="M16 8h.01" /><path d="M8 16h.01" /><path d="M16 16h.01" /><path d="M12 12h.01" />
        </svg>
        {qty > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
            {qty}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-stone-600 bg-stone-900/95 p-3 shadow-xl shadow-black/50">
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-stone-400">Свободный кубик</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {DICE.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCounts((c) => ({ ...c, [s]: (c[s] ?? 0) + 1 }))}
                className="relative flex h-9 items-center justify-center rounded-lg border border-stone-600 bg-stone-800 font-mono text-xs text-stone-200 transition hover:border-ember hover:text-ember"
                title={`к${s}: клик добавляет количество`}
              >
                d{s}
                {(counts[s] ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-white">
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="sheet-btn sheet-btn_primary flex-1 !py-1.5 text-xs"
              disabled={qty === 0}
              onClick={() => {
                onRoll(counts)
                setCounts({})
                setOpen(false)
              }}
            >
              Бросить{qty > 0 ? ` (${qty})` : ''}
            </button>
            <button type="button" className="sheet-btn !py-1.5 text-xs" onClick={() => setCounts({})}>
              Сброс
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SheetHeader({
  character,
  fields = [],
  pb,
  inspiration,
  exhaustion,
  conditionCount,
  initiativeBonus = 0,
  initiativeLast = null,
  onInspiration,
  onExhaustion,
  onOpenHp,
  onOpenAc,
  onOpenConditions,
  levelUpInfo,
  onOpenLevelUp,
  onRollInitiative,
  onRollFree,
}) {
  const { user } = useAuth()
  // ГМ пришёл из панели персонажей — возвращаем его туда, игрок — к списку.
  const location = useLocation()
  const backTo = location.state?.from === 'gm' ? '/gm/characters' : '/characters'
  const allFields = user?.username ? [...fields, { label: 'Игрок', value: user.username }] : fields
  return (
    <div className="sheet-header">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
        <Link
          to={backTo}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-lg text-stone-300 transition hover:border-ember hover:text-ember"
          title="Назад"
        >
          ←
        </Link>
        <span className="sheet-avatar" title="Портрет персонажа">
          {(character.name || '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-x-5 gap-y-2 sm:gap-x-8">
            {allFields.map((f) => (
              <div key={f.label} className="sheet-field">
                <span className="sheet-field__label">{f.label}</span>
                <span className="sheet-field__value">{f.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {levelUpInfo?.can_level_up && (
            <button
              type="button"
              className="sheet-levelup-btn"
              onClick={onOpenLevelUp}
              title={`Доступен потолок ${levelUpInfo.max_level} — повышаемся с уровня ${levelUpInfo.current_level}`}
            >
              ↑ Уровень {(Number(levelUpInfo.current_level) || 1) + 1}
            </button>
          )}
          <RollHistory />
          <DicePicker onRoll={onRollFree} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-stone-800 px-3 py-2.5 sm:gap-x-5 sm:px-4">
        <div className="sheet-hp">
          <button type="button" className="sheet-hp__value" onClick={onOpenHp} title="Хиты и отдых">
            <span className="sheet-hp__heart">♥</span>
            {character.current_hp ?? 0}/{character.max_hp ?? 0}
          </button>
          {(character.temp_hp > 0 || character.shield > 0) && (
            <span className="flex items-center gap-1">
              {character.shield > 0 && (
                <span className="sheet-hp__temp" title="Щит">🛡 {character.shield}</span>
              )}
              {character.temp_hp > 0 && (
                <span className="sheet-hp__temp" title="Временные хиты">✚ {character.temp_hp}</span>
              )}
            </span>
          )}
        </div>
        <BoxedValue label="КД" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenAc}
            title="Класс доспеха и щит"
          >
            {(character.armor_class ?? 0) + (character.shield ?? 0)}
          </button>
        </BoxedValue>
        <BoxedValue label="Скорость">{character.speed ?? '—'}</BoxedValue>
        <BoxedValue label="Владение">+{pb}</BoxedValue>
        <BoxedValue label="Вдохновение" boxClassName="p-0">
          <input
            type="checkbox"
            checked={inspiration}
            onChange={onInspiration}
            className="size-4 accent-ember"
            title="Вдохновение"
          />
        </BoxedValue>
        <BoxedValue label="Состояния">
          <button type="button" className="text-sm text-ember hover:underline" onClick={onOpenConditions}>
            {conditionCount > 0 ? conditionCount : '—'}
          </button>
        </BoxedValue>
        <BoxedValue label="Истощение">
          <Select
            value={exhaustion}
            onChange={(e) => onExhaustion(Number(e.target.value))}
            className="!w-14"
            title="Уровень истощения"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </Select>
        </BoxedValue>
        <BoxedValue label="Инициатива">
          <RollButton
            bonus={initiativeBonus}
            label={initiativeLast != null ? String(initiativeLast) : undefined}
            onClick={onRollInitiative}
            title={initiativeLast != null ? `Последний бросок инициативы: ${initiativeLast}` : 'Инициатива'}
          />
        </BoxedValue>
      </div>
    </div>
  )
}
