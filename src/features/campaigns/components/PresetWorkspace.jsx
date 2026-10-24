import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SaveStatus from '@/components/ui/SaveStatus.jsx'
import useSaveStatus from '@/components/ui/useSaveStatus.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import TagInput from '@/features/articles/components/TagInput.jsx'
import UnsavedGuard from '@/features/articles/components/UnsavedGuard.jsx'
import UnsavedGuardProvider from '@/features/articles/components/UnsavedGuardProvider.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaign, useSavePublicCampaign, useTransitionPublicCampaign } from '@/features/campaigns/queries.js'
import CampaignEditorNav from './CampaignEditorNav.jsx'
import CampaignFormDrawer from './CampaignFormDrawer.jsx'
import PresetTextFields from './PresetTextFields.jsx'
import CampaignKnowledgeBase from './CampaignKnowledgeBase.jsx'
import { sameCampaignEditor } from '../editorNavigation.js'

const STATUS_TONES = { draft: 'default', published: 'good', archived: 'violet' }
const STATUS_HINTS = {
  draft: 'Черновик видите только вы и основатель. После публикации кампания появится в каталоге.',
  published: 'Кампания в каталоге. Игроки читают описание, любой ГМ может создать по ней свой стол.',
  archived: 'В архиве: в каталоге её нет, начатые по ней столы продолжают играть.',
}
const textValues = (preset) => ({ title: preset.title ?? '', pitch: preset.pitch ?? '', description_markdown: preset.description_markdown ?? '' })

function PresetSettings({ children }) {
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 900px)').matches ?? false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 900px)')
    if (!media) return
    const change = () => setMobile(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return mobile
    ? <div className="article-editor-settings-toggle"><Button variant="ghost" onClick={() => setOpen(true)}><LoreIcon name="settings" />Параметры кампании</Button>{open && <Drawer title="Параметры кампании" closeLabel="Закрыть параметры" onClose={() => setOpen(false)} footer={<Button variant="ghost" onClick={() => setOpen(false)}>Закрыть</Button>}><div className="article-editor-parameters">{children}</div></Drawer>}</div>
    : <aside className="article-editor-settings article-editor-parameters" aria-label="Параметры кампании"><h3 className="article-editor-label mb-5">Параметры кампании</h3>{children}</aside>
}

function CampaignActions({ slug, disabled, disableChanges, onArchive, onUnpublish }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    root.current.querySelector('[role="menuitem"]:not(:disabled)')?.focus()
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return (
    <div className="article-editor-menu preset-editor-menu" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <button type="button" ref={trigger} aria-label="Действия с кампанией" aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true) } }}>
        ⋯
      </button>
      {open && <div id={id} className="sort-menu-options" role="menu" aria-label="Действия с кампанией" onKeyDown={(event) => {
        const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')]
        const index = items.indexOf(document.activeElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : null
        if (next !== null) { event.preventDefault(); items[next].focus() }
      }}>
        <Link role="menuitem" to={`/public-campaigns/${slug}`} onClick={() => { setOpen(false); trigger.current?.focus() }}><LoreIcon name="eye" />Предпросмотр</Link>
        {onUnpublish && <button type="button" role="menuitem" disabled={disableChanges} onClick={() => { setOpen(false); trigger.current?.focus(); onUnpublish() }}><LoreIcon name="unpublish" />Снять с публикации</button>}
        {onArchive && <button type="button" role="menuitem" disabled={disableChanges} onClick={() => { setOpen(false); trigger.current?.focus(); onArchive() }}><LoreIcon name="archive" />В архив</button>}
      </div>}
    </div>
  )
}

function PresetEditor({ preset }) {
  const { user, isFounder } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const knowledgeActive = params.get('tab') === 'knowledge'
  const [knowledgeVisited, setKnowledgeVisited] = useState(knowledgeActive)
  if (knowledgeActive && !knowledgeVisited) setKnowledgeVisited(true)
  const { push } = useToasts()
  const save = useSavePublicCampaign()
  const transition = useTransitionPublicCampaign()
  const { statuses, run: saveWithStatus, clear } = useSaveStatus()
  const [draft, setDraft] = useState(null)
  const [starting, setStarting] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [copied])
  const fullLink = new URL(`/public-campaigns/${encodeURIComponent(preset.slug)}`, window.location.origin).href
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(fullLink); setCopied(true) }
    catch { push('Не удалось скопировать ссылку', 'Проверьте разрешение браузера на доступ к буферу обмена.', 'error') }
  }
  const canEdit = isFounder || (preset.author?.id != null && user?.id != null && String(preset.author.id) === String(user.id))
  const dirty = Boolean(draft && Object.keys(draft.values).some((key) => draft.values[key] !== draft.original[key]))
  const busy = save.isPending || transition.isPending || statuses.campaign?.state === 'saving'
  const titleValid = !draft || Boolean(draft.values.title.trim())
  const publishDisabled = busy || dirty
  const saveText = (event) => {
    event.preventDefault()
    if (busy || !dirty || !titleValid) return
    saveWithStatus('campaign', async () => {
      try { await save.mutateAsync({ id: preset.id, ...draft.values, title: draft.values.title.trim(), pitch: draft.values.pitch.trim() }) }
      catch (error) { throw toCampaignError(error) }
      setDraft(null)
    })
  }
  const saveTags = (tags) => {
    if (busy) return
    saveWithStatus('campaign', async () => {
      try { await save.mutateAsync({ id: preset.id, tag_ids: tags.map((tag) => tag.id) }) }
      catch (error) { throw toCampaignError(error) }
    })
  }
  const runTransition = (action, done) => transition.mutate({ id: preset.id, action }, {
    onSuccess: () => { push(done, undefined, 'success'); setConfirmingArchive(false) },
    onError: (error) => { if (action !== 'archive') push('Статус не изменён', toCampaignError(error).message, 'error') },
  })

  return (
    <section className="article-editor preset-editor">
      <UnsavedGuard when={dirty} ignoreNavigation={sameCampaignEditor} />
      <div className="article-editor-heading preset-editor-heading">
        <div className="min-w-0"><h2 className="font-display font-bold text-stone-100">{preset.title}</h2></div>
        <div className="preset-editor-actions">
          <Badge tone={STATUS_TONES[preset.status]}>{publicCampaignStatusLabels[preset.status]}</Badge>
          <SaveStatus status={statuses.campaign} />
          {canEdit && preset.status === 'draft' && <Button size="sm" disabled={publishDisabled} title={dirty ? 'Сначала сохраните текст' : undefined} onClick={() => runTransition('publish', 'Публичная кампания опубликована')}>Опубликовать</Button>}
          <CampaignActions slug={preset.slug} disabled={busy} disableChanges={publishDisabled} onArchive={canEdit && preset.status !== 'archived' ? () => setConfirmingArchive(true) : undefined} onUnpublish={canEdit && preset.status === 'published' ? () => runTransition('unpublish', 'Снято с публикации') : undefined} />
        </div>
      </div>
      <CampaignEditorNav slug={preset.slug} active={knowledgeActive ? 'knowledge' : 'text'} />
      {!canEdit && <p className="lore-preview-notice">Просмотр: текст и параметры изменяют автор и основатель. Материалы мастера доступны во вкладке «База знаний».</p>}
      <div className="article-editor-panel" hidden={knowledgeActive}>
      <div className="article-editor-layout">
        <div className="article-editor-main">
          <div className="space-y-5">
            <div className="preset-editor-text-toolbar">
              <p className="text-hint">{canEdit ? 'Название, зазывалка и описание сохраняются вместе. Теги сохраняются сразу.' : 'Описание публичной кампании и её зазывалка для игроков.'}</p>
              {canEdit && !draft && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { clear('campaign'); const values = textValues(preset); setDraft({ original: values, values }) }}><LoreIcon name="edit" />Изменить текст</Button>}
            </div>
            {draft ? <form onSubmit={saveText} aria-label="Текст публичной кампании" className="space-y-5">
              <div className="preset-editor-text-actions"><Button type="submit" disabled={busy || !dirty || !titleValid}>Сохранить текст</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setDraft(null); clear('campaign') }}>Отмена</Button>{dirty && <span className="text-hint">Есть несохранённые изменения</span>}</div>
              <PresetTextFields value={draft.values} disabled={busy} onChange={(values) => { clear('campaign'); setDraft({ ...draft, values }) }} />
              {!titleValid && <p className="text-sm text-red-300" role="alert">Укажите название кампании.</p>}
            </form> : <>
              <section><h3 className="article-editor-label mb-2">Зазывалка</h3><p className="text-body whitespace-pre-wrap">{preset.pitch || 'Зазывалка пока не написана.'}</p></section>
              <section><h3 className="article-editor-label mb-2">Описание</h3><ArticleText value={preset.description_markdown} empty="Описание пока не написано." /></section>
            </>}
          </div>
        </div>
        <PresetSettings>
          <section className="article-workflow" aria-label="Публикация"><h3 className="article-editor-label">Публикация</h3><p className="text-hint">{STATUS_HINTS[preset.status]}</p></section>
          <div className="mt-5">
            {canEdit ? <fieldset disabled={busy}><TagInput value={preset.tags} onChange={saveTags} /></fieldset> : <section><h3 className="article-editor-label mb-2">Теги</h3><p className="text-hint">{preset.tags.map((tag) => `#${tag.name}`).join(' ') || 'Тегов пока нет.'}</p></section>}
          </div>
          <dl className="preset-editor-meta">
            <div><dt className="article-editor-label">Автор</dt><dd>{preset.author ? `@${preset.author.username}` : 'Автор удалён'}</dd></div>
            <div><dt className="article-editor-label">Опубликована</dt><dd>{preset.published_at ? formatDateTime(preset.published_at) : 'Ещё не опубликована'}</dd></div>
            <div><dt className="article-editor-label">Страница кампании</dt><dd><button type="button" className="preset-copy-link" title={fullLink} aria-label="Скопировать полную ссылку на кампанию" onClick={copyLink}><LoreIcon name={copied ? 'check' : 'copy'} />{fullLink}</button>{copied && <span className="text-hint block mt-1" role="status">Ссылка скопирована</span>}</dd></div>
          </dl>
          <section className="article-workflow mt-6" aria-label="Игровые столы по кампании">
            <h3 className="article-editor-label">Игровые столы</h3>
            <p className="text-hint">{preset.campaign_count > 0 ? `Столов: ${preset.campaign_count}` : 'Столов пока нет.'}</p>
            {(preset.status === 'published' || canEdit) && preset.status !== 'archived' && <Button size="sm" variant="ghost" className="w-full" disabled={publishDisabled} title={dirty ? 'Сначала сохраните текст' : undefined} onClick={() => setStarting(true)}><LoreIcon name="plus" />Создать игровой стол</Button>}
          </section>
        </PresetSettings>
      </div>
      </div>
      <div className="article-editor-panel" hidden={!knowledgeActive}>{knowledgeVisited && <CampaignKnowledgeBase preset={preset} />}</div>
      {starting && <CampaignFormDrawer preset={preset} onClose={() => setStarting(false)} onSaved={(campaign) => { setStarting(false); navigate(`/campaigns/${campaign.id}`) }} />}
      {confirmingArchive && <ConfirmDialog title="Отправить в архив?" message="Публичная кампания пропадёт из каталога. Уже начатые по ней столы продолжат играть." confirmText="В архив" busyText="Архивируем…" busy={transition.isPending} error={transition.error && toCampaignError(transition.error)} onCancel={() => { setConfirmingArchive(false); transition.reset() }} onConfirm={() => runTransition('archive', 'Публичная кампания в архиве')} />}
    </section>
  )
}

export default function PresetWorkspace({ slug }) {
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  if (error) return <ErrorBox error={toCampaignError(error)} onRetry={refetch} />
  if (isLoading || !preset) return <Skeleton className="h-64 w-full" />
  return <UnsavedGuardProvider key={preset.id}><PresetEditor preset={preset} /></UnsavedGuardProvider>
}
