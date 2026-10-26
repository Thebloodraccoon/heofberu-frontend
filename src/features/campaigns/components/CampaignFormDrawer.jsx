import { useEffect, useRef, useState } from 'react'
import { Badge, Button, ErrorBox, Field, Input, Select } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { stripGmBlocks } from '@/features/articles/secrets.js'
import { campaignStatusLabels } from '@/lib/i18n/index.js'
import { CAMPAIGN_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCreateCampaign, useUpdateCampaign } from '@/features/campaigns/queries.js'
import PresetPicker from './PresetPicker.jsx'

const STATUS_HINTS = {
  planning: 'Подготовка к игре. Можно собирать состав и планировать сессии.',
  active: 'Игра идёт. Состав можно менять.',
  paused: 'Игра на паузе. Состав сохранится.',
  finished: 'Игра завершена. Активные персонажи станут свободны для других столов.',
  abandoned: 'Игра прервана. Активные персонажи станут свободны для других столов.',
}

const initialForm = (campaign, preset) => ({
  title: campaign?.title ?? preset?.title ?? '',
  status: campaign?.status ?? 'planning',
  public_campaign: campaign?.public_campaign ?? preset ?? null,
})

export default function CampaignFormDrawer({ campaign, preset, onClose, onSaved, archiveAction, restoreAction }) {
  const editing = Boolean(campaign)
  const [initial] = useState(() => initialForm(campaign, preset))
  const [form, setForm] = useState(initial)
  const [titleEdited, setTitleEdited] = useState(editing)
  const [titleTouched, setTitleTouched] = useState(false)
  const [basis, setBasis] = useState(initial.public_campaign ? 'public' : 'own')
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const pickerRef = useRef(null)
  const pickerTriggerRef = useRef(null)
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const mutation = editing ? update : create
  const pending = mutation.isPending || archiveAction?.isPending || restoreAction?.isPending
  const chosen = form.public_campaign
  const dirty = form.title !== initial.title || form.status !== initial.status || chosen?.id !== initial.public_campaign?.id
  const titleError = !form.title.trim() ? 'Укажите название стола.' : ''
  const valid = !titleError && (editing || basis !== 'public' || Boolean(chosen))
  const closingGame = editing && form.status !== campaign.status && ['finished', 'abandoned'].includes(form.status)
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!dirty && !pending) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])

  useEffect(() => {
    if (picking) pickerRef.current?.querySelector('button')?.focus()
    else if (pickerTriggerRef.current?.isConnected) pickerTriggerRef.current.focus()
  }, [picking])

  const openPicker = () => { pickerTriggerRef.current = document.activeElement; setPicking(true) }

  const requestClose = () => {
    if (pending) return
    if (dirty) setConfirming('close')
    else onClose()
  }
  const save = () => {
    if (!valid || pending || (editing && !dirty)) return
    const body = {
      title: form.title.trim(),
      public_campaign_id: chosen ? chosen.id : editing ? null : undefined,
      ...(editing ? { status: form.status } : {}),
    }
    mutation.mutate(editing ? { id: campaign.id, ...body } : body, { onSuccess: onSaved })
  }
  const choosePreset = (next) => {
    setForm((current) => ({ ...current, public_campaign: next, title: !editing && (!titleEdited || !current.title.trim()) ? next.title : current.title }))
    setBasis('public')
    setPicking(false)
  }
  const cancelConfirmation = () => {
    if (pending) return
    setConfirming(null)
    archiveAction?.reset?.()
    restoreAction?.reset?.()
  }
  const confirmationError = confirming === 'archive' ? archiveAction?.error : confirming === 'restore' ? restoreAction?.error : confirming === 'finish' ? mutation.error : null
  const confirmation = confirming ? {
    title: confirming === 'close' ? 'Закрыть без сохранения?' : confirming === 'archive' ? 'Отправить стол в архив?' : confirming === 'restore' ? 'Вернуть стол из архива?' : form.status === 'finished' ? 'Завершить игру?' : 'Прервать игру?',
    message: confirming === 'close' ? 'Введённые изменения не сохранятся.'
      : confirming === 'archive' ? `Стол останется доступен для чтения. Активные персонажи будут сняты с игры.${dirty ? ' Несохранённые изменения настроек будут отменены.' : ''}`
        : confirming === 'restore' ? `Персонажей нужно будет добавить заново.${dirty ? ' Несохранённые изменения настроек будут отменены.' : ''}`
          : 'Активные персонажи будут сняты с игры и станут свободны для других столов.',
    confirmText: confirming === 'close' ? 'Не сохранять' : confirming === 'archive' ? 'В архив' : confirming === 'restore' ? 'Вернуть из архива' : 'Сохранить',
    busyText: confirming === 'archive' ? 'Архивируем…' : confirming === 'restore' ? 'Возвращаем…' : 'Сохраняем…',
    busy: pending,
    error: confirmationError && toCampaignError(confirmationError),
    onCancel: cancelConfirmation,
    onConfirm: () => {
      if (pending) return
      if (confirming === 'close') onClose()
      else if (confirming === 'archive') archiveAction.run()
      else if (confirming === 'restore') restoreAction.run()
      else save()
    },
  } : null

  return (
    <Drawer title={picking ? 'Публичная кампания' : editing ? 'Настройки стола' : 'Новый игровой стол'} subtitle={picking ? 'Выберите основу для своей игры.' : editing ? campaign.title : 'Состав, сессии и заметки вашей игровой группы.'} onClose={requestClose} confirmation={confirmation} closeLabel="Закрыть форму кампании" className="campaign-form-drawer" bodyClassName={picking ? 'grant-picker-body' : ''} footer={picking
      ? <Button variant="ghost" className="w-full" onClick={() => setPicking(false)}>Назад</Button>
      : <div className="article-filter-actions"><Button variant="ghost" disabled={pending} onClick={requestClose}>Отмена</Button><Button type="submit" form="campaign-form" disabled={!valid || pending || (editing && !dirty)}>{mutation.isPending ? 'Сохраняем…' : editing ? 'Сохранить' : 'Создать стол'}</Button></div>
    }>
      <div hidden={picking}>
        <form id="campaign-form" noValidate onSubmit={(event) => { event.preventDefault(); setTitleTouched(true); if (valid && !pending) { if (closingGame) setConfirming('finish'); else save() } }}>
          <fieldset disabled={pending} className="campaign-drawer-form">
            {!editing && <section className="campaign-drawer-section">
              <h3 className="article-editor-label">Основа игры</h3>
              <div className="campaign-basis-options" role="group" aria-label="Основа игры">
                <button type="button" aria-pressed={basis === 'own'} onClick={() => { setBasis('own'); set('public_campaign', null) }}><LoreIcon name="note" /><strong>Своя история</strong><span>Мир и сюжет с чистого листа.</span></button>
                <button type="button" aria-pressed={basis === 'public'} onClick={() => { setBasis('public'); if (!chosen) openPicker() }}><LoreIcon name="book" /><strong>Публичная кампания</strong><span>Готовая основа для вашей группы.</span></button>
              </div>
            </section>}
            <section className="campaign-drawer-section">
              {editing && <h3 className="article-editor-label">Основное</h3>}
              <Field label="Название стола"><Input value={form.title} maxLength={200} onChange={(event) => { setTitleEdited(true); set('title', event.target.value) }} onBlur={() => setTitleTouched(true)} aria-invalid={titleTouched && Boolean(titleError)} aria-describedby="campaign-title-hint" placeholder="Например, «Тайна затонувшего маяка»" /></Field>
              <p id="campaign-title-hint" className={titleTouched && titleError ? 'text-sm text-red-300' : 'text-hint'}>{titleTouched && titleError ? titleError : 'До 200 символов. Название можно изменить позже.'}</p>
            </section>
            {editing && <section className="campaign-drawer-section">
              <h3 className="article-editor-label">Статус</h3>
              <Field label="Состояние игры"><Select value={form.status} onChange={(event) => set('status', event.target.value)} aria-describedby="campaign-status-hint">{CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{campaignStatusLabels[status]}</option>)}</Select></Field>
              <p id="campaign-status-hint" className={closingGame ? 'campaign-warning' : 'text-hint'}>{STATUS_HINTS[form.status]}</p>
            </section>}
            {(editing || basis === 'public') && <section className="campaign-drawer-section">
              <h3 className="article-editor-label">Публичная кампания</h3>
              {chosen ? <div className="campaign-source-card">
                <div className="campaign-source-heading"><LoreIcon name="book" /><div><p className="campaign-picker-title">{chosen.title}</p>{chosen.author?.username && <p className="text-hint">@{chosen.author.username}</p>}</div></div>
                {stripGmBlocks(chosen.pitch ?? '').trim() && <p className="campaign-note-excerpt">{stripGmBlocks(chosen.pitch).trim()}</p>}
                <div className="campaign-source-actions"><button type="button" onClick={openPicker}><LoreIcon name="edit" />Изменить</button><button type="button" onClick={() => { set('public_campaign', null); setBasis('own') }}><LoreIcon name="close" />Убрать</button></div>
              </div> : <button type="button" className="campaign-source-empty" onClick={openPicker}><LoreIcon name="book" /><span><strong>Выбрать публичную кампанию</strong><span>По какой истории будет играть стол.</span></span><LoreIcon name="chevron" /></button>}
              {editing && !chosen && <p className="text-hint">Своя история, без публичной кампании.</p>}
            </section>}
            {!editing && <p className="campaign-drawer-note"><Badge>{campaignStatusLabels.planning}</Badge><span>Стол создастся в статусе подготовки. После создания добавьте персонажей и назначьте первую сессию.</span></p>}
            {mutation.error && <ErrorBox error={toCampaignError(mutation.error)} onRetry={closingGame ? () => setConfirming('finish') : save} />}
          </fieldset>
        </form>
        {editing && (archiveAction || restoreAction) && <section className="campaign-settings-archive" aria-label="Архив">
          <h3 className="article-editor-label">Архив</h3>
          <p className="text-hint">{campaign.archived_at ? 'Стол в архиве. Его можно вернуть, но персонажей придётся добавить заново.' : 'Стол останется доступен для чтения. Активные персонажи будут сняты с игры.'}</p>
          {campaign.archived_at ? restoreAction && <Button variant="ghost" disabled={pending} onClick={() => setConfirming('restore')}><LoreIcon name="undo" />Вернуть из архива</Button> : archiveAction && <Button variant="danger" disabled={pending} onClick={() => setConfirming('archive')}><LoreIcon name="archive" />В архив</Button>}
        </section>}
      </div>
      {picking && <div ref={pickerRef} className="contents"><PresetPicker value={chosen} onPick={choosePreset} onBack={() => setPicking(false)} backLabel={editing ? 'К настройкам' : 'К созданию стола'} /></div>}
    </Drawer>
  )
}
