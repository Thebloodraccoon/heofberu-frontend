import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ConfirmDialog, ErrorBox, RichTextEditor, Skeleton, TextField } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import TagInput from '@/features/articles/components/TagInput.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import { publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { usePublicCampaign, useSavePublicCampaign, useTransitionPublicCampaign } from '@/features/campaigns/queries.js'
import CampaignFormDrawer from './CampaignFormDrawer.jsx'
import PresetKnowledgeBase from './PresetKnowledgeBase.jsx'
import { SECRET_TOOL } from './secretTool.jsx'

const TABS = [['text', 'Текст'], ['knowledge', 'База знаний']]
const STATUS_TONES = { draft: 'default', published: 'good', archived: 'violet' }
const STATUS_HINTS = {
  draft: 'Черновик видите только вы и основатель. Опубликуйте — и кампания появится в каталоге.',
  published: 'Кампания в каталоге: игроки её читают, любой ГМ может начать по ней свой стол.',
  archived: 'В архиве: в каталоге её нет, начатые по ней столы продолжают играть.',
}
const ACTIONS = { draft: [['publish', 'Опубликовать'], ['archive', 'В архив']], published: [['unpublish', 'Снять с публикации'], ['archive', 'В архив']], archived: [] }

// Колонка параметров — как «Параметры статьи» в редакторе лора; на узком экране уходит в Drawer.
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
    ? <div className="article-editor-settings-toggle"><Button variant="ghost" onClick={() => setOpen(true)}>Параметры кампании</Button>{open && <Drawer title="Параметры кампании" closeLabel="Закрыть параметры" onClose={() => setOpen(false)}><div className="article-editor-parameters">{children}</div></Drawer>}</div>
    : <aside className="article-editor-settings article-editor-parameters" aria-label="Параметры кампании"><h3 className="article-editor-label mb-5">Параметры кампании</h3>{children}</aside>
}

function ReadOnlyField({ label, children }) {
  return <div><span className="text-label mb-1.5 block">{label}</span><div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-200">{children || <span className="text-stone-500">—</span>}</div></div>
}

// Описание правится как текст статьи: «Изменить» → редактор с «Секретом мастера» → «Сохранить».
function DescriptionField({ value, onSave }) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const save = async () => {
    setSaving(true)
    setError(null)
    try { await onSave(draft); setEdit(false) } catch (e) { setError(toCampaignError(e)) } finally { setSaving(false) }
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2"><span className="text-label">Описание</span>{!edit && <button type="button" className="btn-edit-inline" aria-label="Изменить описание" onClick={() => { setDraft(value); setEdit(true) }}>Изменить</button>}</div>
      {edit ? <>
        <RichTextEditor value={draft} disabled={saving} onChange={(event) => setDraft(event.target.value)} extraTools={[SECRET_TOOL]} rows={14} autoFocus ariaLabel="Описание публичной кампании" placeholder="Сюжет, тон, что ждёт игроков…" />
        {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
        <div className="flex flex-wrap gap-2"><Button size="sm" disabled={saving} onClick={save}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => setEdit(false)}>Отмена</Button></div>
      </> : <div className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2"><ArticleText value={value} empty="Описание пока не написано." /></div>}
      <p className="text-hint">Блоки «Секрет мастера» видят только ГМ.</p>
    </div>
  )
}

// Открытая публичная кампания в редакторе — раскладка редактора статей: заголовок, вкладки, параметры справа.
// Автор и основатель правят по полям; другие ГМ читают и могут начать по ней свой стол.
export default function PresetWorkspace({ slug }) {
  const { user, isFounder } = useAuth()
  const navigate = useNavigate()
  const { push } = useToasts()
  const { data: preset, isLoading, error, refetch } = usePublicCampaign(slug)
  const save = useSavePublicCampaign()
  const transition = useTransitionPublicCampaign()
  const [tab, setTab] = useState('text')
  const [starting, setStarting] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  if (error) return <ErrorBox error={toCampaignError(error)} onRetry={refetch} />
  if (isLoading || !preset) return <Skeleton className="h-64 w-full" />

  const canEdit = isFounder || preset.author?.id === user?.id
  const saveField = (field) => async (value) => { await save.mutateAsync({ id: preset.id, [field]: value }); push('Сохранено', undefined, 'success') }
  const run = (action, done) => transition.mutate({ id: preset.id, action }, {
    onSuccess: () => { push(done, undefined, 'success'); setConfirmingArchive(false) },
    onError: (e) => { if (action !== 'archive') push('Статус не изменён', toCampaignError(e).message, 'error') },
  })
  const choose = (action) => (action === 'archive' ? setConfirmingArchive(true) : run(action, action === 'publish' ? 'Публичная кампания опубликована' : 'Снято с публикации'))

  return (
    <section className="article-editor">
      <div className="article-editor-heading">
        <h2 className="min-w-0 font-display text-xl font-bold text-stone-100">{preset.title}</h2>
        <div className="flex items-center gap-3"><Badge tone={STATUS_TONES[preset.status]}>{publicCampaignStatusLabels[preset.status]}</Badge><Link className="link-ember inline-flex items-center gap-1 text-sm" to={`/public-campaigns/${preset.slug}`}>Страница <LoreIcon name="arrow" /></Link></div>
      </div>
      <div className="article-editor-layout">
        <div className="article-editor-main">
          <EditorTabs tabs={TABS} value={tab} onChange={setTab} label="Разделы публичной кампании" />
          <div role="tabpanel" aria-label="Текст" hidden={tab !== 'text'} className="article-editor-panel space-y-5">
            {tab === 'text' && (canEdit ? <>
              <TextField label="Название" value={preset.title} onSave={saveField('title')} />
              <TextField label="Зазывалка" value={preset.pitch} onSave={saveField('pitch')} placeholder="Пара фраз, ради которых захочется сыграть…" />
              <DescriptionField value={preset.description_markdown} onSave={saveField('description_markdown')} />
              <TagInput value={preset.tags} onChange={(tags) => save.mutate({ id: preset.id, tag_ids: tags.map((tag) => tag.id) }, { onSuccess: () => push('Теги сохранены', undefined, 'success'), onError: (e) => push('Теги не сохранены', toCampaignError(e).message, 'error') })} />
            </> : <>
              <p className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm text-stone-300">Эту публичную кампанию написал другой ГМ: править её могут только автор и основатель. Вы можете начать по ней свой стол.</p>
              <ReadOnlyField label="Название">{preset.title}</ReadOnlyField>
              <ReadOnlyField label="Зазывалка">{preset.pitch}</ReadOnlyField>
              <ReadOnlyField label="Описание">{preset.description_markdown && <ArticleText value={preset.description_markdown} />}</ReadOnlyField>
            </>)}
          </div>
          <div role="tabpanel" aria-label="База знаний" hidden={tab !== 'knowledge'} className="article-editor-panel">{tab === 'knowledge' && <PresetKnowledgeBase key={preset.id} preset={preset} canEdit={canEdit} />}</div>
        </div>
        <PresetSettings>
          <section className="article-workflow" aria-label="Статус публичной кампании">
            <h3 className="article-editor-label">Статус</h3>
            <div className="article-workflow-state"><Badge tone={STATUS_TONES[preset.status]}>{publicCampaignStatusLabels[preset.status]}</Badge></div>
            <p className="text-xs text-stone-500">{STATUS_HINTS[preset.status]}</p>
            {canEdit && ACTIONS[preset.status].length > 0 && <div className="article-workflow-actions">{ACTIONS[preset.status].map(([action, label]) => <Button key={action} type="button" size="sm" variant={action === 'publish' ? 'primary' : 'ghost'} className="w-full" disabled={transition.isPending} onClick={() => choose(action)}>{label}</Button>)}</div>}
          </section>
          <section className="article-workflow mt-6" aria-label="Игровые столы по кампании">
            <h3 className="article-editor-label">Игровые столы</h3>
            <p className="text-sm text-stone-300">{preset.campaign_count > 0 ? `Сыграно столов: ${preset.campaign_count}` : 'По ней ещё не играли.'}</p>
            {(preset.status === 'published' || canEdit) && preset.status !== 'archived' && <Button size="sm" className="w-full" onClick={() => setStarting(true)}><LoreIcon name="plus" />Начать кампанию</Button>}
          </section>
          <div className="mt-6 space-y-3 text-sm text-stone-400">
            <ReadOnlyField label="Автор">{preset.author?.username ?? 'Автор удалён'}</ReadOnlyField>
            <ReadOnlyField label="Опубликована">{preset.published_at ? formatDateTime(preset.published_at) : 'Ещё нет'}</ReadOnlyField>
            <ReadOnlyField label="Ссылка">/public-campaigns/{preset.slug}</ReadOnlyField>
          </div>
        </PresetSettings>
      </div>
      {starting && <CampaignFormDrawer presetId={preset.id} onClose={() => setStarting(false)} onSaved={(campaign) => { setStarting(false); navigate(`/campaigns/${campaign.id}`) }} />}
      {confirmingArchive && <ConfirmDialog title="Отправить в архив?" message="Публичная кампания пропадёт из каталога. Уже начатые по ней столы продолжат играть." confirmText="В архив" busyText="Архивируем…" busy={transition.isPending} error={transition.error && toCampaignError(transition.error)} onCancel={() => { setConfirmingArchive(false); transition.reset() }} onConfirm={() => run('archive', 'Публичная кампания в архиве')} />}
    </section>
  )
}
