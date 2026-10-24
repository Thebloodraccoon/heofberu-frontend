import { Link } from 'react-router-dom'
import { ErrorBox, Skeleton } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { isCampaignGm } from '../api.js'
import { toCampaignError } from '../errors.js'
import { nextCampaignSession } from '../overview.js'
import { useOverviewRoster, useOverviewSessions } from '../queries.js'
import { sentenceCase } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import DescriptionField from './DescriptionField.jsx'

export default function CampaignOverview({ campaign, onSaveDescription }) {
  const isGm = isCampaignGm(campaign)
  const sessions = useOverviewSessions(campaign.id)
  const roster = useOverviewRoster(campaign.id, { enabled: isGm })
  const next = nextCampaignSession(sessions.data ?? [])
  const undated = (sessions.data ?? []).filter((session) => !session.scheduled_at)
  const active = (roster.data ?? []).filter((participation) => participation.status === 'active')
  const preview = next ?? undated[0]

  return (
    <div className={`campaign-overview ${isGm ? '' : 'campaign-overview--player'}`}>
      <section className="campaign-overview-section campaign-overview-session" aria-labelledby="campaign-next-session" aria-busy={sessions.isLoading}>
        <div className="campaign-overview-heading"><h2 id="campaign-next-session" className="text-label">Ближайшая сессия</h2><Link className="article-back" to="?tab=sessions">Все сессии<LoreIcon name="chevron" /></Link></div>
        {sessions.isLoading ? <Skeleton className="h-24 w-full" /> : sessions.error ? <ErrorBox error={toCampaignError(sessions.error)} onRetry={sessions.refetch} /> : preview ? <>
          <Link className="campaign-overview-session-link" to={`/campaigns/${campaign.id}/sessions/${preview.id}`}>
            <span className="campaign-overview-date"><LoreIcon name="calendar" />{preview.scheduled_at ? formatDateTime(preview.scheduled_at) : 'Дата не назначена'}</span>
            <span className="campaign-overview-session-title">{preview.title || `Сессия №${preview.number}`}</span>
            {undated.length > 0 && next && <span className="text-hint">Без даты: {undated.length}. Их можно найти во всех сессиях.</span>}
            <span className="campaign-overview-open">Открыть сессию<LoreIcon name="arrow" /></span>
          </Link>
        </> : <p className="text-muted">{isGm ? 'Предстоящих сессий нет. Запланируйте новую во вкладке «Сессии».' : 'ГМ ещё не назначил следующую сессию.'}</p>}
      </section>

      {isGm && <section className="campaign-overview-section campaign-overview-roster" aria-labelledby="campaign-active-roster" aria-busy={roster.isLoading}>
        <div className="campaign-overview-heading"><h2 id="campaign-active-roster" className="text-label">В игре{roster.data && !roster.error && <span className="campaign-overview-count">{active.length}</span>}</h2><Link className="article-back" to="?tab=roster">Весь состав<LoreIcon name="chevron" /></Link></div>
        {roster.isLoading ? <Skeleton className="h-24 w-full" /> : roster.error ? <ErrorBox error={toCampaignError(roster.error)} onRetry={roster.refetch} /> : active.length ? <>
          <ul className="campaign-overview-characters" aria-label="Персонажи в игре">{active.slice(0, 4).map(({ id, character, owner }) => <li key={id}>
            <Link to={`/characters/${character.id}`} className="campaign-overview-character"><span className="min-w-0"><span className="campaign-overview-character-name">{character.name}</span><span className="campaign-card-meta">{[`${character.level} ур.`, sentenceCase(character.class_name), owner && `@${owner.username}`].filter(Boolean).join(' · ')}</span></span><LoreIcon name="chevron" /></Link>
          </li>)}</ul>
        </> : <p className="text-muted">Активных персонажей нет. Добавьте их во вкладке «Состав».</p>}
      </section>}

      <section className="campaign-overview-section campaign-overview-description" aria-label="Описание кампании">
        <DescriptionField value={campaign.description_markdown} framed={false} ariaLabel="Описание кампании" placeholder="Завязка, тон, правила стола…" empty={isGm ? 'Описание пока не написано.' : 'ГМ пока не написал описание.'} onSave={onSaveDescription} />
      </section>
    </div>
  )
}
