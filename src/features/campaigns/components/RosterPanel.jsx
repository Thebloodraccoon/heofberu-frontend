import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ConfirmDialog, ErrorBox, Select, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { campaignCharacterStatusLabels, sentenceCase } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useRosterPage, useSetRosterStatus } from '@/features/campaigns/queries.js'
import { allowedStatusMoves, needsConfirmation } from '@/features/campaigns/rosterRules.js'
import CandidatesDrawer from './CandidatesDrawer.jsx'
import GmPanelDrawer from './GmPanelDrawer.jsx'
import StatusBadge from './StatusBadge.jsx'

const PAGE_SIZE = 20

export default function RosterPanel({ campaign }) {
  const { user } = useAuth()
  const { push } = useToasts()
  const isGm = isCampaignGm(campaign)
  const closed = isCampaignClosed(campaign)
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [panelFor, setPanelFor] = useState(null)
  const { data, isLoading, isPlaceholderData, error, refetch } = useRosterPage(campaign.id, { page, size: PAGE_SIZE })
  const setStatus = useSetRosterStatus(campaign.id)
  const roster = data?.items ?? []

  const apply = (participation, status) => setStatus.mutate({ participationId: participation.id, status }, {
    onSuccess: () => { setRemoving(null); push(`${participation.character.name}: ${campaignCharacterStatusLabels[status].toLowerCase()}`, undefined, 'success') },
    onError: (e) => { if (!needsConfirmation(status)) push('Статус не изменён', toCampaignError(e).message, 'error') },
  })
  const choose = (participation, status) => (needsConfirmation(status) ? setRemoving({ participation, status }) : apply(participation, status))

  return (
    <section aria-label="Состав кампании" className="campaign-panel">
      <div className="campaign-panel-header">
        <p className="text-muted">{isGm ? 'Вы добавляете персонажей сами; игрок не может покинуть кампанию. Пока персонаж в игре, вы ведёте его лист.' : 'Персонажи этой кампании. Состав меняет ГМ.'}</p>
        {isGm && <Button disabled={closed} title={closed ? 'Кампания закрыта: состав не меняется' : undefined} onClick={() => setAdding(true)}><LoreIcon name="plus" />Добавить персонажа</Button>}
      </div>
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="campaign-roster" aria-busy="true"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
      {!isLoading && !error && (roster.length === 0
        ? <p className="lore-empty">{isGm ? 'В кампании пока нет персонажей. Добавьте их — игроки увидят кампанию у себя.' : 'Персонажей пока нет.'}</p>
        : <ul className={`campaign-roster ${isPlaceholderData ? 'opacity-60' : ''}`}>{roster.map((participation) => {
          const moves = allowedStatusMoves(participation.status)
          const ownSheet = participation.owner?.id === user?.id
          return <li key={participation.id} className="catalog-record-card campaign-roster-card" data-status={participation.status}>
            <span className="sheet-avatar shrink-0" aria-hidden="true">{(participation.character.name || '?').slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2"><span className="font-display font-bold text-stone-100">{participation.character.name}</span><StatusBadge kind="character" status={participation.status} /></span>
              <span className="block text-xs text-stone-400">{[participation.owner && `@${participation.owner.username}`, `${participation.character.level} ур.`, sentenceCase(participation.character.class_name), participation.character.race_name && sentenceCase(participation.character.race_name)].filter(Boolean).join(' · ')}</span>
              <span className="block text-hint">В кампании с {formatDateTime(participation.joined_at)}{participation.ended_at && ` · до ${formatDateTime(participation.ended_at)}`}</span>
            </span>
            <div className="campaign-roster-actions">
              <div className="campaign-roster-main-actions">
                {(isGm ? participation.status === 'active' : ownSheet) && <Link className="campaign-roster-sheet" to={`/characters/${participation.character.id}`}><LoreIcon name="book" />Лист<LoreIcon name="arrow" /></Link>}
                {isGm && participation.status === 'active' && <Button variant="ghost" onClick={() => setPanelFor(participation.character)}><LoreIcon name="edit" />ГМ-панель</Button>}
              </div>
              {isGm && moves.length > 0 && <div className="campaign-roster-status"><Select value="" aria-label={`Статус: ${participation.character.name}`} placeholder="Изменить статус" disabled={closed || setStatus.isPending} title={closed ? 'Кампания закрыта: состав не меняется' : undefined} onChange={(event) => event.target.value && choose(participation, event.target.value)}>{moves.map((status) => <option key={status} value={status}>{campaignCharacterStatusLabels[status]}</option>)}</Select></div>}
            </div>
          </li>
        })}</ul>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      {panelFor && <GmPanelDrawer characterId={panelFor.id} name={panelFor.name} onClose={() => setPanelFor(null)} />}
      {adding && <CandidatesDrawer campaign={campaign} onClose={() => setAdding(false)} />}
      {removing && <ConfirmDialog title="Исключить персонажа?" message={`${removing.participation.character.name} покинет кампанию, а игрок потеряет к ней доступ, если других его персонажей в ней нет. Вернуть персонажа можно, добавив его заново.`} confirmText="Исключить" busyText="Исключаем…" busy={setStatus.isPending} error={setStatus.error && toCampaignError(setStatus.error)} onCancel={() => { setRemoving(null); setStatus.reset() }} onConfirm={() => apply(removing.participation, removing.status)} />}
    </section>
  )
}
