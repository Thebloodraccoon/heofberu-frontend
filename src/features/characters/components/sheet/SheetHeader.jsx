import { Link } from 'react-router-dom'
import { BoxedValue, RollButton, XpBar } from '@/components/sheet/primitives.jsx'

export default function SheetHeader({
  character,
  subtitle,
  level,
  pb,
  collapsed,
  editing,
  inspiration,
  exhaustion,
  conditionCount,
  rollsOn,
  onToggleCollapse,
  onToggleEdit,
  onInspiration,
  onExhaustion,
  onOpenHp,
  onOpenConditions,
  onRollInitiative,
}) {
  return (
    <div className="sheet-header">
      {!collapsed && (
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <Link
            to="/characters"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-stone-300 transition hover:border-ember hover:text-ember"
            title="К списку персонажей"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-stone-100">{character.name || 'Безымянный персонаж'}</p>
            <p className="truncate text-xs text-stone-400">{subtitle || '&nbsp;'}</p>
            <div className="mt-2 max-w-xs">
              <XpBar level={level} current={0} next={300} />
            </div>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-stone-600 bg-stone-900 font-display text-lg font-black text-stone-100 shadow-[inset_0_0_0_2px_rgba(0,0,0,0.35)]">
            {(character.name || '?').slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-800 px-4 py-2.5">
        <BoxedValue label="КД">{character.armor_class ?? '—'}</BoxedValue>
        <BoxedValue label="Скорость">{character.speed ?? '—'}</BoxedValue>
        <BoxedValue label="Владение">+{pb}</BoxedValue>
        <div className="ml-auto flex items-center gap-4">
          <span className="sheet-chip" title="Золото">
            ⛁ {character.money_gold ?? 0}
          </span>
          <button type="button" className="sheet-btn" onClick={onOpenHp} title="Отдых и хиты">
            ⛺ Отдых
          </button>
          <button type="button" className="sheet-btn" onClick={onOpenHp} title="Хиты">
            ♥ {character.current_hp ?? 0}/{character.max_hp ?? 0}
            {character.temp_hp > 0 && <span className="ml-1 text-emerald-300">(+{character.temp_hp})</span>}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-stone-800 px-4 py-2.5">
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
            <select
              value={exhaustion}
              onChange={(e) => onExhaustion(Number(e.target.value))}
              className="w-12 rounded border border-stone-700 bg-stone-800/70 px-1 py-1 text-center text-sm text-stone-100 outline-none focus:border-ember"
              title="Уровень истощения"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </BoxedValue>
          <BoxedValue label="Инициатива">
            <RollButton bonus={0} disabled={!rollsOn} onClick={onRollInitiative} title="Инициатива" />
          </BoxedValue>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleEdit}
              className={`sheet-btn ${editing ? 'sheet-btn_primary' : ''}`}
            >
              {editing ? '✓ Готово' : '✎ Редактировать'}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center justify-center gap-1 rounded-b-xl border-t border-stone-800 py-1 text-[11px] uppercase tracking-wide text-stone-500 transition hover:text-stone-300"
      >
        <svg className={`size-3 transition ${collapsed ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
        </svg>
        {collapsed ? 'развернуть' : 'свернуть'}
      </button>
    </div>
  )
}
