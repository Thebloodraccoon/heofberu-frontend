import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import RollHistory from '@/components/sheet/RollHistory.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { useUsers } from '@/features/users/queries.js'

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
  levelUpInfo,
  onOpenLevelUp,
  pendingChoicesCount = 0,
  onOpenChoices,
  onRollFree,
  onOpenSettings,
}) {
  const { user } = useAuth()
  const isOwner = character?.owner_id == null || Number(character?.owner_id) === Number(user?.id)
  const { data: users = [] } = useUsers({ enabled: !isOwner })
  const ownerName = isOwner
    ? user?.username
    : character?.owner_username ??
      users.find((u) => Number(u.id) === Number(character?.owner_id))?.username ??
      `#${character?.owner_id}`
  const allFields = ownerName ? [...fields, { label: 'Игрок', value: ownerName }] : fields
  const pick = (label) => allFields.find((f) => f.label === label)?.value
  return (
    <div className="sheet-header">
      <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5 max-[800px]:flex-col">
        <span className="sheet-avatar" title="Портрет персонажа">
          {(character.name || '?').slice(0, 1).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1 max-[800px]:w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 max-sm:w-full max-sm:flex-col-reverse">
            <span className="sheet-name max-sm:w-full max-sm:text-center">{pick('Имя') || character.name || 'Безымянный персонаж'}</span>
            <div className="flex items-center justify-end gap-2 max-sm:w-full max-sm:justify-center">
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
              {pendingChoicesCount > 0 && (
                <button
                  type="button"
                  className="sheet-levelup-btn"
                  onClick={onOpenChoices}
                  title="Есть особенности, для которых нужно сделать выбор"
                >
                  ✦ Выборы {pendingChoicesCount > 1 ? `(${pendingChoicesCount})` : ''}
                </button>
              )}
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
          </div>

          <div className="flex items-center gap-x-[8rem] gap-y-2 max-lg:w-full max-lg:flex-col max-lg:items-center">
            <div className="sheet-chips">
              <span className="sheet-chip sheet-chip--lvl">Ур. {pick('Уровень') ?? '—'}</span>
              {pick('Класс') &&
                (character.class_id ? (
                  <Link
                    to={`/catalog/classes/${character.class_id}`}
                    className="sheet-chip sheet-chip--link"
                    title="Класс в каталоге"
                  >
                    {pick('Класс')}
                  </Link>
                ) : (
                  <span className="sheet-chip">{pick('Класс')}</span>
                ))}
              {pick('Подкласс') &&
                (character.class_id && character.subclass_id ? (
                  <Link
                    to={`/catalog/classes/${character.class_id}?sub=${character.subclass_id}`}
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
                  <Link
                    to={`/catalog/races/${character.race_id}`}
                    className="sheet-chip sheet-chip--link"
                    title="Раса в каталоге"
                  >
                    {pick('Раса')}
                  </Link>
                ) : (
                  <span className="sheet-chip">{pick('Раса')}</span>
                ))}
              {pick('Подраса') &&
                (character.race_id && character.subrace_id ? (
                  <Link
                    to={`/catalog/races/${character.race_id}?sub=${character.subrace_id}`}
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
                  <Link
                    to={`/catalog/backgrounds/${character.background_id}`}
                    className="sheet-chip sheet-chip--link"
                    title="Предыстория в каталоге"
                  >
                    {pick('Предыстория')}
                  </Link>
                ) : (
                  <span className="sheet-chip">{pick('Предыстория')}</span>
                ))}
              {pick('Игрок') && <span className="sheet-chip sheet-chip--dim">Игрок: {pick('Игрок')}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}