import { fmtBonus } from '@/lib/utils/sheet.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

function Stat({ label, value, hint, onClick, actionIcon = 'edit', ariaLabel, className = '', children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`character-stat ${className}`} aria-label={ariaLabel} {...(onClick ? { type: 'button', onClick } : {})}>
      <span className="character-stat-label">{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
      {children}
      {onClick && actionIcon && <LoreIcon name={actionIcon} className="character-stat-action" />}
    </Tag>
  )
}

export default function QuickStatsPanel({ character, pb, inspiration, onOpenInspiration, onOpenHp, onOpenAc, initiativeBonus, onRollInitiative, fields, className = '' }) {
  const hp = Number(character.current_hp) || 0
  const maxHp = Number(character.max_hp) || 0
  const tempHp = Number(character.temp_hp) || 0
  const percent = maxHp > 0 ? Math.max(0, Math.min(100, hp / maxHp * 100)) : 0
  const show = (field) => !fields || fields.includes(field)
  return (
    <section className={`character-stats ${className}`} aria-label="Основные показатели">
      {show('hp') && <Stat label="Хиты" value={<><span className="character-health-current">{hp}</span><span>/ {maxHp}</span>{tempHp > 0 && <span className="character-health-temp" aria-label={`Временные хиты: ${tempHp}`}>+{tempHp} врем.</span>}</>} onClick={onOpenHp} className={`character-stat-hp ${percent <= 25 ? 'is-low' : ''}`}>
        <span className="character-health-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
      </Stat>}
      {show('ac') && <Stat label={fields ? 'КД' : 'Класс доспеха'} ariaLabel={`Класс доспеха: ${Number(character.armor_class ?? 0) + Number(character.shield ?? 0)}`} value={Number(character.armor_class ?? 0) + Number(character.shield ?? 0)} hint={Number(character.shield) > 0 ? `Щит: +${character.shield}` : undefined} onClick={onOpenAc} />}
      {show('initiative') && <Stat label="Инициатива" value={fmtBonus(initiativeBonus)} onClick={onRollInitiative} actionIcon={null} />}
      {show('speed') && <Stat label="Скорость" value={<>{character.speed ?? '—'} <span>фт</span></>} />}
      {show('pb') && <Stat label="Владение" value={fmtBonus(pb)} />}
      {show('inspiration') && <Stat label="Вдохновения" value={inspiration} onClick={onOpenInspiration} />}
    </section>
  )
}
