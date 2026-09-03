import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  onOpenMoney,
  levelUpInfo,
  onOpenLevelUp,
  onRollInitiative,
  onRollFree,
  onOpenSettings,
}) {
  const { user } = useAuth()
  const allFields = user?.username ? [...fields, { label: 'Игрок', value: user.username }] : fields
  const pick = (label) => allFields.find((f) => f.label === label)?.value
  return (
    <div className="sheet-header">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
        <span className="order-1 sheet-avatar" title="Портрет персонажа">
          {(character.name || '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="order-4 flex w-full items-center justify-end gap-2 sm:order-3 sm:w-auto">
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
        </div>
        <div className="order-2 flex flex-1 items-center justify-end gap-2 sm:order-3 sm:ml-auto sm:w-auto sm:flex-none">
          <button
            type="button"
            onClick={onOpenSettings}
            className="grid size-10 place-items-center rounded-full border border-stone-700 bg-stone-800/70 text-stone-300 transition hover:border-ember hover:text-ember"
            title="Настройки персонажа"
            aria-label="Настройки персонажа"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <RollHistory />
          <DicePicker onRoll={onRollFree} />
        </div>
        <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto sm:flex-1">
          <span className="sheet-name">{pick('Имя') || character.name || 'Безымянный персонаж'}</span>
          <div className="sheet-chips">
            <span className="sheet-chip sheet-chip--lvl">Ур. {pick('Уровень') ?? '—'}</span>
            {pick('Класс') &&
              (character.class_id ? (
                <Link to={`/catalog/classes/${character.class_id}`} className="sheet-chip sheet-chip--link" title="Класс в каталоге">
                  {pick('Класс')}
                </Link>
              ) : (
                <span className="sheet-chip">{pick('Класс')}</span>
              ))}
            {pick('Подкласс') &&
              (character.class_id ? (
                <Link
                  to={character.subclass_id ? `/catalog/classes/${character.class_id}?sub=${character.subclass_id}` : `/catalog/classes/${character.class_id}`}
                  className="sheet-chip sheet-chip--link"
                  title="Подкласс — в каталоге класса"
                >
                  {pick('Подкласс')}
                </Link>
              ) : (
                <span className="sheet-chip">{pick('Подкласс')}</span>
              ))}
            {pick('Раса') &&
              (character.race_id ? (
                <Link to={`/catalog/races/${character.race_id}`} className="sheet-chip sheet-chip--link" title="Раса в каталоге">
                  {pick('Раса')}
                </Link>
              ) : (
                <span className="sheet-chip">{pick('Раса')}</span>
              ))}
            {pick('Подраса') &&
              (character.race_id ? (
                <Link
                  to={character.subrace_id ? `/catalog/races/${character.race_id}?sub=${character.subrace_id}` : `/catalog/races/${character.race_id}`}
                  className="sheet-chip sheet-chip--link"
                  title="Подраса — в каталоге расы"
                >
                  {pick('Подраса')}
                </Link>
              ) : (
                <span className="sheet-chip">{pick('Подраса')}</span>
              ))}
            {pick('Предыстория') &&
              (character.background_id ? (
                <Link to={`/catalog/backgrounds/${character.background_id}`} className="sheet-chip sheet-chip--link" title="Предыстория в каталоге">
                  {pick('Предыстория')}
                </Link>
              ) : (
                <span className="sheet-chip">{pick('Предыстория')}</span>
              ))}
            {pick('Игрок') && <span className="sheet-chip sheet-chip--dim">Игрок: {pick('Игрок')}</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 border-t border-stone-800 px-3 py-2.5 sm:justify-start sm:gap-x-5 sm:px-4">
        <BoxedValue label="Хиты" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenHp}
            title="Хиты и отдых"
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span className="flex items-center gap-1">
                <span className="sheet-hp__heart">♥</span>
                {character.current_hp ?? 0}/{character.max_hp ?? 0}
              </span>
              {Number(character.temp_hp) > 0 && (
                <span className="whitespace-nowrap text-[10px] font-normal text-emerald-300">
                  ♥ {character.temp_hp}
                </span>
              )}
            </span>
          </button>
        </BoxedValue>
        <BoxedValue label="КД" boxClassName="p-0">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 text-inherit"
            onClick={onOpenAc}
            title="Класс доспеха и щит — нажмите, чтобы изменить"
          >
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span>{(character.armor_class ?? 0) + (character.shield ?? 0)}</span>
              {(character.shield ?? 0) > 0 && (
                <span className="whitespace-nowrap text-[10px] font-normal text-gold">🛡 +{character.shield}</span>
              )}
            </span>
          </button>
        </BoxedValue>
        <BoxedValue label="Скорость">
          <span>{character.speed ?? '—'}</span>
        </BoxedValue>
        <BoxedValue label="Владение">
          <span>+{pb}</span>
        </BoxedValue>
        <BoxedValue label="Инициатива" boxClassName="min-w-14">
          <RollButton
            bonus={initiativeBonus}
            label={initiativeLast != null ? String(initiativeLast) : undefined}
            onClick={onRollInitiative}
            className="!text-sm !min-w-10 !h-9"
            title={initiativeLast != null ? `Последний бросок инициативы: ${initiativeLast}` : 'Инициатива'}
          />
        </BoxedValue>
        <BoxedValue label="Вдохновение" boxClassName="p-0">
          <input
            type="checkbox"
            checked={inspiration}
            onChange={onInspiration}
            className="sheet-insp"
            title="Вдохновение"
          />
        </BoxedValue>
        <BoxedValue label="Состояния">
          <button type="button" className="text-ember hover:underline" onClick={onOpenConditions}>
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
        <BoxedValue label="Деньги" boxClassName="p-0 min-w-28">
          <button
            type="button"
            className="h-full w-full rounded-[inherit] px-2 py-1 text-left text-stone-200"
            onClick={onOpenMoney}
            title="Изменить деньги"
          >
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="text-yellow-300">⛁</span>
                <span>{character.money_gold ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-stone-300">⛀</span>
                <span>{character.money_silver ?? 0}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-amber-700">⛁</span>
                <span>{character.money_copper ?? 0}</span>
              </span>
            </span>
          </button>
        </BoxedValue>
      </div>
    </div>
  )
}
