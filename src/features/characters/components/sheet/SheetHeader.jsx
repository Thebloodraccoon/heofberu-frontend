import { Link } from 'react-router-dom'
import RollHistory from '@/components/sheet/RollHistory.jsx'
import DicePicker from './DicePicker.jsx'
import { Button } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { useUsers } from '@/features/users/queries.js'

export default function SheetHeader({ character, fields = [], levelUpInfo, onOpenLevelUp, pendingChoicesCount = 0, onOpenChoices, onRollFree, onOpenSettings }) {
  const { user } = useAuth()
  const isOwner = character?.owner_id == null || Number(character?.owner_id) === Number(user?.id)
  const { data: users = [] } = useUsers({ enabled: !isOwner })
  const ownerName = isOwner ? user?.username : character?.owner_username ?? users.find((u) => Number(u.id) === Number(character?.owner_id))?.username ?? `#${character?.owner_id}`
  const pick = (label) => fields.find((f) => f.label === label)?.value
  const links = [
    ['Класс', character.class_id && `/catalog/classes/${character.class_id}`],
    ['Подкласс', character.class_id && character.subclass_id && `/catalog/classes/${character.class_id}?sub=${character.subclass_id}`],
    ['Раса', character.race_id && `/catalog/races/${character.race_id}`],
    ['Подраса', character.race_id && character.subrace_id && `/catalog/races/${character.race_id}?sub=${character.subrace_id}`],
    ['Предыстория', character.background_id && `/catalog/backgrounds/${character.background_id}`],
  ]
  return (
    <header className="character-sheet-header">
      <p className="lore-eyebrow">Лист персонажа</p>
      <div className="character-identity-row">
        <span className="character-avatar" aria-hidden="true">{(character.name || '?').slice(0, 1).toUpperCase()}</span>
        <div className="character-identity">
          <h1 className="heading-section">{pick('Имя') || character.name || 'Безымянный персонаж'}</h1>
          <div className="character-identity-meta"><span>Уровень {pick('Уровень') ?? character.level ?? 1}</span>{links.filter(([label]) => pick(label)).map(([label, to]) => to ? <Link key={label} to={to} title={`${label} в справочнике`}>{pick(label)}</Link> : <span key={label}>{pick(label)}</span>)}</div>
          {ownerName && <p className="character-owner">Игрок: {ownerName.startsWith('@') ? ownerName : `@${ownerName}`}</p>}
        </div>
        <div className="character-header-actions">
          <DicePicker onRoll={onRollFree} />
          <RollHistory />
          <Button variant="ghost" onClick={onOpenSettings} aria-label="Настройки персонажа" title="Настройки персонажа"><LoreIcon name="settings" /></Button>
        </div>
      </div>
      {(levelUpInfo?.can_level_up || pendingChoicesCount > 0) && (
        <div className="character-progression-notice">
          {levelUpInfo?.can_level_up && <Button variant="ghost" onClick={onOpenLevelUp}><LoreIcon name="levelUp" /> Повысить до уровня {(Number(levelUpInfo.current_level) || 1) + 1}</Button>}
          {pendingChoicesCount > 0 && <Button variant="ghost" onClick={onOpenChoices}><LoreIcon name="plus" /> Незавершённые выборы: {pendingChoicesCount}</Button>}
        </div>
      )}
    </header>
  )
}
