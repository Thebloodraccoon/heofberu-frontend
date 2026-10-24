import { useLayoutEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { usePublicCharacterNames } from '@/features/campaigns/characterNames.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaign, usePublicCampaignCharacters, usePublicCampaignReviews } from '@/features/campaigns/queries.js'
import StatusBadge from '../components/StatusBadge.jsx'
import TagLinks from '../components/TagLinks.jsx'
import CampaignFormDrawer from '../components/CampaignFormDrawer.jsx'

const SHOWCASE_SIZE = 12
const REVIEWS_SIZE = 10

const withDetail = (name, detail) => (detail ? `${name} (${detail.toLowerCase()})` : name)

// Жетон героя на всю строку: медальон с буквой имени и уровнем, раса и класс с уточнениями (имена — из справочника
// по id), игрок. В витрину попадают только открытые герои, поэтому пометки о публичности нет.
function HeroToken({ character }) {
  const names = usePublicCharacterNames(character)
  const origin = [names.raceName && withDetail(names.raceName, names.subraceName), names.className && withDetail(names.className, names.subclassName)].filter(Boolean).join(' · ')
  return (
    <Link to={`/characters/${character.id}/public`} className="hero-token">
      <span className="hero-token-medal" aria-hidden="true">{(character.name || '?').slice(0, 1).toUpperCase()}<span className="hero-token-level">{character.level}</span></span>
      <span className="hero-token-body">
        <span className="hero-token-name">{character.name}</span>
        <span className="hero-token-origin"><span className="sr-only">{character.level} уровень{origin && ', '}</span>{origin}</span>
        <span className="hero-token-meta"><span className="truncate">игрок {character.owner_username}</span></span>
      </span>
      <LoreIcon name="arrow" className="hero-token-arrow" />
    </Link>
  )
}

function Showcase({ preset }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePublicCampaignCharacters(preset.id, { page, size: SHOWCASE_SIZE })
  const characters = data?.items ?? []
  return <>
    {isLoading ? <Skeleton className="h-20 w-full" /> : characters.length === 0 ? <p className="preset-tab-empty">Пока никто не показал своих героев.</p> : <ul className="preset-showcase">{characters.map((character) => <li key={character.id}><HeroToken character={character} /></li>)}</ul>}
    <Pagination page={page} total={data?.total ?? 0} size={SHOWCASE_SIZE} onPage={setPage} />
  </>
}

function Reviews({ preset }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePublicCampaignReviews(preset.id, { page, size: REVIEWS_SIZE })
  const reviews = data?.items ?? []
  return <>
    {isLoading ? <Skeleton className="h-16 w-full" /> : reviews.length === 0 ? <p className="preset-tab-empty">Отзывов пока нет.</p> : <ul className="campaign-reviews preset-reviews">{reviews.map((review) => <li key={review.id} className="campaign-review"><p className="campaign-review-meta"><span className="font-medium text-stone-200">{review.author?.username ?? 'Игрок'}</span><span>{formatDateTime(review.created_at)}</span></p><p className="text-body whitespace-pre-line">{review.body}</p></li>)}</ul>}
    <Pagination page={page} total={data?.total ?? 0} size={REVIEWS_SIZE} onPage={setPage} />
  </>
}

const TABS = [['reviews', 'Отзывы'], ['heroes', 'Герои']]

// Под описанием — отзывы и герои вкладками (по умолчанию отзывы): две кнопки по центру через черту.
// Вкладка живёт в ?tab=, ссылкой можно поделиться.
function PresetTabs({ preset }) {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'reviews'
  const select = (next) => setParams((current) => { const updated = new URLSearchParams(current); if (next === 'reviews') updated.delete('tab'); else updated.set('tab', next); return updated }, { replace: true })
  const onKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = TABS.findIndex(([key]) => key === tab)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    select(TABS[next][0])
    event.currentTarget.querySelectorAll('[role="tab"]')[next].focus()
  }
  return (
    <div className="preset-tabs">
      <div className="preset-split-tabs" role="tablist" aria-label="Отзывы и герои" onKeyDown={onKeyDown}>
        {TABS.map(([key, title]) => <button key={key} type="button" role="tab" aria-selected={tab === key} tabIndex={tab === key ? 0 : -1} onClick={() => select(key)}>{title}</button>)}
      </div>
      <div role="tabpanel" aria-label="Отзывы" hidden={tab !== 'reviews'}>{tab === 'reviews' && <Reviews preset={preset} />}</div>
      <div role="tabpanel" aria-label="Герои" hidden={tab !== 'heroes'}>{tab === 'heroes' && <Showcase preset={preset} />}</div>
    </div>
  )
}

// Страница публичной кампании: название, столы и автор, теги (ведут в лор), зазывалка, описание и под ним вкладки:
// отзывы и витрина героев. ГМ видит в описании блоки «Только для мастера»; переключатель «Глазами игрока» (как в лоре)
// прячет их — так страницу видят игроки. Действия ГМ — в строке «назад»: база знаний и редактор.
export default function PublicCampaignPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isGM, isFounder } = useAuth()
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  const [playerView, setPlayerView] = useState(false)
  const [starting, setStarting] = useState(false)
  const listSearch = location.state?.campaignListSearch ?? ''
  const back = { pathname: '/public-campaigns', search: listSearch }
  const backState = { restoreCampaignList: location.state?.campaignListSearch !== undefined }

  useLayoutEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (error) return <div className="lore-page"><ErrorBox error={toCampaignError(error)} onRetry={refetch} /><p className="mt-4"><Link className="link-ember" to={back} state={backState}>К каталогу</Link></p></div>
  if (isLoading || !preset) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-80" /><SkeletonCard className="min-h-[20rem]" /></div>

  // ГМ получает от бэка полный текст: секреты видны ему, пока не включён взгляд игрока. Игрокам бэк их не отдаёт.
  const gmView = isGM && !playerView
  const asPlayer = (text) => stripGmBlocks(text ?? '').trim()
  const canEdit = isFounder || (preset.author?.id != null && user?.id != null && String(preset.author.id) === String(user.id))
  const canStart = preset.status !== 'archived' && (preset.status === 'published' || canEdit)

  return (
    <div className="lore-page preset-page">
      {/* Как в лоре: слева — назад к доске, справа — действия ГМ. */}
      <div className="preset-toolbar">
        <Link to={back} state={backState}><LoreIcon name="back" />Доска приключений</Link>
        {isGM && <div className="flex flex-wrap gap-2" role="group" aria-label="Действия ГМ">
          <button type="button" className="lore-player-switch" role="switch" aria-checked={playerView} onClick={() => setPlayerView((current) => !current)}><LoreIcon name="eye" /> Глазами игрока <span className="lore-switch-track" aria-hidden="true" /></button>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/public-campaigns/${preset.slug}/knowledge`)}><LoreIcon name="book" />База знаний</Button>
          {canEdit && <Button size="sm" variant="ghost" onClick={() => navigate(`/gm/public-campaigns?slug=${encodeURIComponent(preset.slug)}`)}><LoreIcon name="edit" />Редактировать</Button>}
          {canStart && <Button size="sm" onClick={() => setStarting(true)}><LoreIcon name="plus" />Создать игровой стол</Button>}
        </div>}
      </div>
      {isGM && playerView && <p className="lore-preview-notice">Глазами игрока: секреты мастера скрыты.</p>}

      <div className="preset-column">
        <header className="lore-header preset-hero">
          <h1 className="heading-section">{preset.title}</h1>
          <div className="campaign-header-meta">{preset.status !== 'published' && <StatusBadge kind="preset" status={preset.status} />}<span>{preset.campaign_count > 0 ? `Сыграно столов: ${preset.campaign_count}` : 'Ещё не играли'}</span><span>{preset.author ? `@${preset.author.username}` : 'Автор удалён'}</span></div>
          <TagLinks tags={preset.tags} />
          {asPlayer(preset.pitch) && <p className="preset-pitch">{asPlayer(preset.pitch)}</p>}
        </header>

        <section className="preset-section preset-description" aria-label="Описание"><ArticleText value={gmView ? preset.description_markdown : asPlayer(preset.description_markdown)} empty="Описание пока не написано." /></section>
        <PresetTabs preset={preset} />
      </div>
      {starting && <CampaignFormDrawer preset={preset} onClose={() => setStarting(false)} onSaved={(campaign) => { setStarting(false); navigate(`/campaigns/${campaign.id}`) }} />}
    </div>
  )
}
