import { combatLineValue, speedSections } from '@/lib/utils/combatStats.js'

// Таблица расчёта (GET /characters/{id}/combat-stats) в стиле таблиц владений:
// строки, которые дали итог, сам итог, и — приглушённо, с причиной — то, что до
// персонажа дошло, но сейчас не считается (не то снаряжение, не тот уровень,
// нет такой скорости). ``hideTitle`` — в окне, где заголовок уже над таблицей.
function TableTitle({ title, hidden }) {
  return hidden ? null : <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">{title}</p>
}

// Строки источников: применённые — обычные, неприменённые — приглушённо, с причиной.
function LineRows({ lines, unit, inactive = false }) {
  return lines.map((line, i) =>
    inactive ? (
      <tr key={`off-${i}`} className="combat-table__inactive">
        <td>
          {line.label}
          {line.reason && <span className="block text-[11px]">{line.reason}</span>}
        </td>
        <td>{combatLineValue(line, unit)}</td>
      </tr>
    ) : (
      <tr key={`on-${i}`}>
        <td className="text-stone-200">{line.label}</td>
        <td className="text-stone-400">{combatLineValue(line, unit)}</td>
      </tr>
    ),
  )
}

// Расчёт движка (GET /combat-stats) рядом с ручным значением листа в окнах КД и
// скорости: итог и из чего он сложился. Игрок сам решает, какое число вписать в лист.
export function CombatPanel({ title, total, children }) {
  return (
    <section className="mt-6" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-stone-500">{title}</p>
        <strong className="font-display text-xl text-stone-100">{total}</strong>
      </div>
      {children}
    </section>
  )
}

function CombatTable({ title, hideTitle = false, lines = [], inactive = [], total, unit = '' }) {
  return (
    <div>
      <TableTitle title={title} hidden={hideTitle} />
      <div className="overflow-hidden rounded-lg border border-stone-800">
        <table className="sheet-table combat-table w-full table-fixed" aria-label={title}>
          <thead>
            <tr>
              <th scope="col" className="w-1/2">Источник</th>
              <th scope="col" className="w-1/2">Значение</th>
            </tr>
          </thead>
          <tbody>
            <LineRows lines={lines} unit={unit} />
            <tr className="combat-table__total">
              <th scope="row">Итого</th>
              <td>{total == null ? 'нет' : `${total}${unit ? ` ${unit}` : ''}`}</td>
            </tr>
            {inactive.length > 0 && (
              <tr className="combat-table__group">
                <th colSpan={2} scope="rowgroup">Сейчас не применяется</th>
              </tr>
            )}
            <LineRows lines={inactive} unit={unit} inactive />
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ArmorClassTable({ armorClass, title = 'Класс доспеха', hideTitle = false }) {
  if (!armorClass) return null
  return (
    <CombatTable
      title={title}
      hideTitle={hideTitle}
      lines={armorClass.breakdown}
      inactive={armorClass.inactive}
      total={armorClass.computed}
    />
  )
}

// Одна таблица на все скорости: секция на каждый вид, который есть у персонажа
// или к которому есть (пусть неприменённые) бонусы — ходьба, полёт, плавание,
// лазание, копание. Заголовок секции несёт итог, неприменённое — приглушённо с причиной.
export function SpeedTable({ speed, title = 'Скорость', hideTitle = false }) {
  const sections = speedSections(speed)
  if (sections.length === 0) return null
  return (
    <div>
      <TableTitle title={title} hidden={hideTitle} />
      <div className="overflow-hidden rounded-lg border border-stone-800">
        <table className="sheet-table combat-table w-full table-fixed" aria-label={title}>
          <thead>
            <tr>
              <th scope="col" className="w-1/2">Источник</th>
              <th scope="col" className="w-1/2">Значение</th>
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.type} aria-label={section.label}>
              <tr className="combat-table__total">
                <th scope="rowgroup">{section.label}</th>
                <td>{section.total == null ? 'нет' : `${section.total} фт`}</td>
              </tr>
              <LineRows lines={section.lines} unit="фт" />
              <LineRows lines={section.inactive} unit="фт" inactive />
            </tbody>
          ))}
        </table>
      </div>
    </div>
  )
}

// Блок для вкладки «Развитие персонажа»: КД первой строкой, скорость второй —
// тот же расчёт, что в окнах КД и скорости.
export default function CombatStatsSection({ combat }) {
  if (!combat) return null
  return (
    <section aria-label="Расчёт КД и скорости" className="space-y-6">
      <ArmorClassTable armorClass={combat.armor_class} />
      <SpeedTable speed={combat.speed} />
    </section>
  )
}
