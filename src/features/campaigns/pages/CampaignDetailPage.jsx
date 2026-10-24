import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { campaignCharacterStatusLabels } from '@/lib/i18n/index.js'
import { isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useArchiveCampaign, useCampaign, useRestoreCampaign, useUpdateCampaign } from '@/features/campaigns/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { knowledgeTarget } from '../editorNavigation.js'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'
import CampaignOverview from '../components/CampaignOverview.jsx'
import NotesPanel from '../components/NotesPanel.jsx'
import ReviewsPanel from '../components/ReviewsPanel.jsx'
import RosterPanel from '../components/RosterPanel.jsx'
import SessionsPanel from '../components/SessionsPanel.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const TABS = [['overview', 'Обзор'], ['roster', 'Состав'], ['sessions', 'Сессии'], ['notes', 'Заметки'], ['reviews', 'Отзывы']]
const GM_TABS = ['roster', 'notes']

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { push } = useToasts()
  const { user } = useAuth()
  const { data: campaign, isLoading, error, refetch } = useCampaign(id)
  const archive = useArchiveCampaign()
  const restore = useRestoreCampaign()
  const update = useUpdateCampaign()
  const [editing, setEditing] = useState(false)
  const isGm = isCampaignGm(campaign)
  // Заметки и состав — только ГМ кампании (по viewer_role: ГМ-игрок чужого стола видит её как игрок).
  // Игроку — обзор, сессии и отзывы; своих персонажей он видит в шапке.
  const tabs = TABS.filter(([key]) => isGm || !GM_TABS.includes(key))
  const tab = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview'
  const setTab = (key) => setParams(key === 'overview' ? {} : { tab: key }, { replace: true })

  if (error) return <div className="lore-page"><ErrorBox error={toCampaignError(error)} onRetry={refetch} /><p className="mt-4"><Link className="link-ember" to="/campaigns">К моим играм</Link></p></div>
  if (isLoading || !campaign) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-3 h-4 w-32" /><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>

  const doArchive = () => archive.mutate(campaign.id, { onSuccess: () => { setEditing(false); push('Кампания в архиве', 'Активные персонажи сняты с игры.', 'success') } })
  const doRestore = () => restore.mutate(campaign.id, {
    onSuccess: () => { setEditing(false); push('Кампания возвращена из архива', 'Персонажей нужно добавить заново.', 'success') },
  })

  return (
    <div className="lore-page campaign-page">
      {/* Как в лоре: слева — назад, справа — действия; архив живёт в настройках. */}
      <div className="lore-reading-toolbar">
        {isGm ? <Link to="/gm/campaigns"><LoreIcon name="back" />Игровые столы</Link> : <Link to="/campaigns"><LoreIcon name="back" />Мои игры</Link>}
        {isGm && <div className="lore-reading-actions">{campaign.public_campaign && <Link to={knowledgeTarget(campaign.public_campaign.slug)}><LoreIcon name="book" />База знаний</Link>}<button type="button" onClick={() => setEditing(true)}><LoreIcon name="settings" />Настройки</button></div>}
      </div>
      <header className="lore-header article-workspace-header campaign-header">
        <div>
          <div className="campaign-header-meta campaign-header-status"><StatusBadge kind="campaign" status={campaign.status} />{campaign.archived_at && <Badge tone="violet">В архиве</Badge>}<span>{campaign.owner ? `Ведёт @${campaign.owner.username}${campaign.owner.id === user?.id ? ' (вы)' : ''}` : 'ГМ удалил аккаунт'}</span>{campaign.public_campaign && <Link className="link-ember" to={`/public-campaigns/${campaign.public_campaign.slug}`}>По мотивам «{campaign.public_campaign.title}»</Link>}</div>
          <h1 className="heading-section">{campaign.title}</h1>
          {campaign.my_characters?.length > 0 && <div className="campaign-card-characters mt-3" aria-label="Ваши персонажи"><span className="text-hint">Ваши персонажи:</span>{campaign.my_characters.map((character) => <Link key={character.participation_id} className="lore-chip" to={`/characters/${character.character_id}`}>{character.name}<span className="text-hint">· {campaignCharacterStatusLabels[character.status].toLowerCase()}</span></Link>)}</div>}
        </div>
      </header>
      {isCampaignClosed(campaign) && <p className="lore-preview-notice">{campaign.archived_at ? 'Кампания в архиве: её можно читать, но состав больше не меняется.' : 'Кампания закрыта: состав больше не меняется.'}</p>}

      <EditorTabs tabs={tabs} value={tab} onChange={setTab} label="Разделы кампании" />
      <div className="campaign-tabpanels">
        <div role="tabpanel" aria-label="Обзор" hidden={tab !== 'overview'}>{tab === 'overview' && <CampaignOverview campaign={campaign} onSaveDescription={isGm ? async (description_markdown) => { await update.mutateAsync({ id: campaign.id, description_markdown }); push('Описание сохранено', undefined, 'success') } : undefined} />}</div>
        {isGm && <div role="tabpanel" aria-label="Состав" hidden={tab !== 'roster'}>{tab === 'roster' && <RosterPanel campaign={campaign} />}</div>}
        <div role="tabpanel" aria-label="Сессии" hidden={tab !== 'sessions'}>{tab === 'sessions' && <SessionsPanel campaign={campaign} />}</div>
        {isGm && <div role="tabpanel" aria-label="Заметки" hidden={tab !== 'notes'}>{tab === 'notes' && <NotesPanel campaign={campaign} />}</div>}
        <div role="tabpanel" aria-label="Отзывы" hidden={tab !== 'reviews'}>{tab === 'reviews' && <ReviewsPanel campaign={campaign} />}</div>
      </div>

      {editing && <CampaignFormDrawer campaign={campaign} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); push('Кампания сохранена', undefined, 'success') }} archiveAction={{ ...archive, run: doArchive }} restoreAction={{ ...restore, run: doRestore }} />}
    </div>
  )
}
