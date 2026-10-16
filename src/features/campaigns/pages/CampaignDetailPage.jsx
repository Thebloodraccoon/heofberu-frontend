import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { campaignCharacterStatusLabels } from '@/lib/i18n/index.js'
import { isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useArchiveCampaign, useCampaign, useRestoreCampaign } from '@/features/campaigns/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'
import NotesPanel from '../components/NotesPanel.jsx'
import ReviewsPanel from '../components/ReviewsPanel.jsx'
import RosterPanel from '../components/RosterPanel.jsx'
import SessionsPanel from '../components/SessionsPanel.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const TABS = [['overview', 'Обзор'], ['roster', 'Состав'], ['sessions', 'Сессии'], ['notes', 'Заметки'], ['reviews', 'Отзывы']]

export default function CampaignDetailPage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { push } = useToasts()
  const { user } = useAuth()
  const { data: campaign, isLoading, error, refetch } = useCampaign(id)
  const archive = useArchiveCampaign()
  const restore = useRestoreCampaign()
  const [editing, setEditing] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const isGm = isCampaignGm(campaign)
  // Заметки — только ГМ кампании (по viewer_role: ГМ-игрок чужого стола видит её как игрок).
  const tabs = TABS.filter(([key]) => key !== 'notes' || isGm)
  const tab = tabs.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview'
  const setTab = (key) => setParams(key === 'overview' ? {} : { tab: key }, { replace: true })

  if (error) return <div className="lore-page"><ErrorBox error={toCampaignError(error)} onRetry={refetch} /><p className="mt-4"><Link className="link-ember" to="/characters">К моим персонажам и играм</Link></p></div>
  if (isLoading || !campaign) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-3 h-4 w-32" /><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>

  const doArchive = () => archive.mutate(campaign.id, { onSuccess: () => { setConfirmingArchive(false); push('Кампания в архиве', 'Активные персонажи сняты с игры.', 'success') } })
  const doRestore = () => restore.mutate(campaign.id, {
    onSuccess: () => push('Кампания возвращена из архива', 'Персонажей нужно добавить заново.', 'success'),
    onError: (e) => push('Не удалось вернуть кампанию', toCampaignError(e).message, 'error'),
  })

  return (
    <div className="lore-page campaign-page">
      <nav className="campaign-breadcrumbs" aria-label="Навигация">{isGm ? <Link to="/gm/campaigns"><LoreIcon name="back" />Игровые столы</Link> : <Link to="/characters"><LoreIcon name="back" />Мои персонажи и игры</Link>}</nav>
      <header className="lore-header article-workspace-header campaign-header">
        <div>
          <p className="lore-eyebrow">{campaign.owner?.id === user?.id ? 'Вы ведёте эту кампанию' : isGm ? 'Вы смотрите как основатель' : 'Вы играете в этой кампании'}</p>
          <h1 className="heading-section">{campaign.title}</h1>
          <div className="campaign-header-meta"><StatusBadge kind="campaign" status={campaign.status} />{campaign.archived_at && <Badge tone="violet">В архиве</Badge>}<span>ГМ: {campaign.owner?.username ?? 'аккаунт удалён'}</span>{campaign.public_campaign && <Link className="link-ember" to={`/public-campaigns/${campaign.public_campaign.slug}`}>По мотивам «{campaign.public_campaign.title}»</Link>}</div>
          {campaign.my_characters?.length > 0 && <div className="campaign-card-characters mt-3" aria-label="Ваши персонажи"><span className="text-hint">Ваши персонажи:</span>{campaign.my_characters.map((character) => <Link key={character.participation_id} className="lore-chip" to={`/characters/${character.character_id}`}>{character.name}<span className="text-hint">· {campaignCharacterStatusLabels[character.status].toLowerCase()}</span></Link>)}</div>}
        </div>
        {isGm && <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setEditing(true)}><LoreIcon name="settings" />Настройки</Button>{campaign.archived_at ? <Button variant="ghost" disabled={restore.isPending} onClick={doRestore}><LoreIcon name="undo" />Вернуть из архива</Button> : <Button variant="ghost" onClick={() => setConfirmingArchive(true)}>В архив</Button>}</div>}
      </header>
      {isCampaignClosed(campaign) && <p className="lore-preview-notice">{campaign.archived_at ? 'Кампания в архиве: её можно читать, но состав больше не меняется.' : 'Кампания закрыта: состав больше не меняется.'}</p>}

      <EditorTabs tabs={tabs} value={tab} onChange={setTab} label="Разделы кампании" />
      <div className="campaign-tabpanels">
        <div role="tabpanel" aria-label="Обзор" hidden={tab !== 'overview'}>{tab === 'overview' && <section className="campaign-panel" aria-label="Описание кампании"><ArticleText value={campaign.description_markdown} empty={isGm ? 'Описание пока не написано. Добавьте его в настройках.' : 'ГМ пока не написал описание.'} /></section>}</div>
        <div role="tabpanel" aria-label="Состав" hidden={tab !== 'roster'}>{tab === 'roster' && <RosterPanel campaign={campaign} />}</div>
        <div role="tabpanel" aria-label="Сессии" hidden={tab !== 'sessions'}>{tab === 'sessions' && <SessionsPanel campaign={campaign} />}</div>
        {isGm && <div role="tabpanel" aria-label="Заметки" hidden={tab !== 'notes'}>{tab === 'notes' && <NotesPanel campaign={campaign} />}</div>}
        <div role="tabpanel" aria-label="Отзывы" hidden={tab !== 'reviews'}>{tab === 'reviews' && <ReviewsPanel campaign={campaign} />}</div>
      </div>

      {editing && <CampaignFormDrawer campaign={campaign} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); push('Кампания сохранена', undefined, 'success') }} />}
      {confirmingArchive && <ConfirmDialog title="Отправить кампанию в архив?" message="Игроки по-прежнему смогут её читать, но активные персонажи будут сняты с игры и станут свободны для других кампаний." confirmText="В архив" busyText="Архивируем…" busy={archive.isPending} error={archive.error && toCampaignError(archive.error)} onCancel={() => { setConfirmingArchive(false); archive.reset() }} onConfirm={doArchive} />}
    </div>
  )
}
