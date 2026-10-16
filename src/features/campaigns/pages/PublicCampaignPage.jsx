import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { characterVisibilityLabels, sentenceCase } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaign, usePublicCampaignCharacters, usePublicCampaignReviews } from '@/features/campaigns/queries.js'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'
import StatusBadge from '../components/StatusBadge.jsx'

const SHOWCASE_SIZE = 12
const REVIEWS_SIZE = 10

function Showcase({ preset }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePublicCampaignCharacters(preset.id, { page, size: SHOWCASE_SIZE })
  const characters = data?.items ?? []
  return (
    <section className="preset-section" aria-label="Персонажи">
      <h2 className="heading-card">Кто здесь играл</h2>
      {isLoading ? <Skeleton className="h-20 w-full" /> : characters.length === 0 ? <p className="text-sm text-stone-400">Пока никто не показал своих героев.</p> : <ul className="preset-showcase">{characters.map((character) => <li key={character.id}>
        <Link to={`/characters/${character.id}/public`} className="catalog-record-card preset-showcase-card">
          <span className="sheet-avatar shrink-0" aria-hidden="true">{(character.name || '?').slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0"><span className="block font-display font-bold text-stone-100">{character.name}</span><span className="block truncate text-xs text-stone-400">{[`${character.level} ур.`, sentenceCase(character.class_name), character.race_name && sentenceCase(character.race_name)].filter(Boolean).join(' · ')}</span><span className="text-hint">Игрок {character.owner_username} · {characterVisibilityLabels[character.public_visibility].toLowerCase()}</span></span>
        </Link>
      </li>)}</ul>}
      <Pagination page={page} total={data?.total ?? 0} size={SHOWCASE_SIZE} onPage={setPage} />
    </section>
  )
}

function Reviews({ preset }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePublicCampaignReviews(preset.id, { page, size: REVIEWS_SIZE })
  const reviews = data?.items ?? []
  return (
    <section className="preset-section" aria-label="Отзывы игроков">
      <h2 className="heading-card">Отзывы игроков</h2>
      {isLoading ? <Skeleton className="h-16 w-full" /> : reviews.length === 0 ? <p className="text-sm text-stone-400">Отзывов пока нет.</p> : <ul className="campaign-reviews">{reviews.map((review) => <li key={review.id} className="campaign-review"><p className="campaign-review-meta"><span className="font-medium text-stone-200">{review.author?.username ?? 'Игрок'}</span><span>{formatDateTime(review.created_at)}</span></p><p className="text-body whitespace-pre-line">{review.body}</p></li>)}</ul>}
      <Pagination page={page} total={data?.total ?? 0} size={REVIEWS_SIZE} onPage={setPage} />
    </section>
  )
}

// Страница публичной кампании всегда такая, какой её видят игроки: зазывалка, описание без секретов мастера,
// витрина персонажей и отзывы. ГМ получает полосу действий: начать свой стол и перейти в редактор
// публичных кампаний, где правка, секреты, база знаний и смена статуса.
export default function PublicCampaignPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isGM, isFounder } = useAuth()
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  const [starting, setStarting] = useState(false)

  if (error) return <div className="lore-page"><ErrorBox error={toCampaignError(error)} onRetry={refetch} /><p className="mt-4"><Link className="link-ember" to="/public-campaigns">К каталогу</Link></p></div>
  if (isLoading || !preset) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>

  const canEdit = Boolean(user) && (isFounder || preset.author?.id === user.id)
  const canStart = isGM && (preset.status === 'published' || (canEdit && preset.status === 'draft'))
  // ГМ получает от бэка полный текст — показываем его так же, как увидит игрок.
  const asPlayer = (text) => stripGmBlocks(text ?? '').trim()

  return (
    <div className="lore-page preset-page">
      <nav className="campaign-breadcrumbs" aria-label="Навигация"><Link to="/public-campaigns"><LoreIcon name="back" />Кампании</Link></nav>
      <header className="lore-header article-workspace-header preset-hero">
        <div>
          <p className="lore-eyebrow">Кампания</p>
          <h1 className="heading-section">{preset.title}</h1>
          {asPlayer(preset.pitch) && <p className="lore-intro preset-pitch">{asPlayer(preset.pitch)}</p>}
          <div className="campaign-header-meta">{preset.status !== 'published' && <StatusBadge kind="preset" status={preset.status} />}<span>{preset.author ? `Автор: ${preset.author.username}` : 'Автор удалён'}</span><span>{preset.campaign_count > 0 ? `Сыграно столов: ${preset.campaign_count}` : 'Ещё не играли'}</span>{preset.tags.map((tag) => <Badge key={tag.id}>#{tag.name}</Badge>)}</div>
        </div>
      </header>
      {isGM && <div className="preset-gm-bar" role="region" aria-label="Действия ГМ">
        <p className="text-hint"><LoreIcon name="eye" /> Так страницу видят игроки.</p>
        <div className="flex flex-wrap gap-2">
          {canStart && <Button size="sm" onClick={() => setStarting(true)}><LoreIcon name="plus" />Начать кампанию</Button>}
          <Button size="sm" variant="ghost" onClick={() => navigate(`/gm/public-campaigns?slug=${encodeURIComponent(preset.slug)}`)}><LoreIcon name="settings" />В редактор</Button>
        </div>
      </div>}

      <div className="preset-layout">
        <section className="preset-section" aria-label="Описание"><ArticleText value={asPlayer(preset.description_markdown)} empty="Описание пока не написано." /></section>
        <Showcase preset={preset} />
        <Reviews preset={preset} />
      </div>

      {starting && <CampaignFormDrawer presetId={preset.id} onClose={() => setStarting(false)} onSaved={(campaign) => { setStarting(false); navigate(`/campaigns/${campaign.id}`) }} />}
    </div>
  )
}
