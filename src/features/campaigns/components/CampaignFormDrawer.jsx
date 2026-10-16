import { useState } from 'react'
import { Button, ErrorBox, Field, Input, RichTextEditor, Select } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { campaignStatusLabels, publicCampaignStatusLabels } from '@/lib/i18n/index.js'
import { CAMPAIGN_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCreateCampaign, usePresetOptions, useUpdateCampaign } from '@/features/campaigns/queries.js'
import { SECRET_TOOL } from './secretTool.jsx'

const fromCampaign = (campaign) => ({
  title: campaign?.title ?? '',
  status: campaign?.status ?? 'planning',
  description_markdown: campaign?.description_markdown ?? '',
  public_campaign_id: campaign?.public_campaign?.id ? String(campaign.public_campaign.id) : '',
})

// Новая кампания или правка своей: при создании из пресета пустые название и описание бэк возьмёт из него.
export default function CampaignFormDrawer({ campaign, presetId, onClose, onSaved }) {
  const editing = Boolean(campaign)
  const [form, setForm] = useState(() => ({ ...fromCampaign(campaign), ...(presetId ? { public_campaign_id: String(presetId) } : {}) }))
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const mutation = editing ? update : create
  const { data: presets = [] } = usePresetOptions()
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const fromPreset = Boolean(form.public_campaign_id)
  const titleError = !form.title.trim() && !(fromPreset && !editing) ? 'Укажите название или выберите публичную кампанию — название возьмётся из неё.' : ''

  const save = (event) => {
    event.preventDefault()
    if (titleError || mutation.isPending) return
    const body = {
      title: form.title.trim() || undefined,
      description_markdown: form.description_markdown || (editing ? '' : undefined),
      public_campaign_id: form.public_campaign_id ? Number(form.public_campaign_id) : editing ? null : undefined,
      ...(editing ? { status: form.status } : {}),
    }
    mutation.mutate(editing ? { id: campaign.id, ...body } : body, { onSuccess: (saved) => onSaved?.(saved) })
  }

  return (
    <Drawer title={editing ? 'Настройки кампании' : 'Новая кампания'} subtitle={editing ? campaign.title : 'Стол, который вы будете вести.'} onClose={onClose} closeLabel="Закрыть форму кампании" footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button type="submit" form="campaign-form" disabled={Boolean(titleError) || mutation.isPending}>{mutation.isPending ? 'Сохраняем…' : editing ? 'Сохранить' : 'Создать'}</Button>
      </div>
    }>
      <form id="campaign-form" className="space-y-4" onSubmit={save}>
        <Field label="Название"><Input value={form.title} maxLength={200} onChange={set('title')} aria-invalid={Boolean(titleError)} aria-describedby="campaign-title-hint" placeholder="Например, «Нова, винницкий филиал»" /></Field>
        <p id="campaign-title-hint" className={titleError ? 'text-sm text-red-300' : 'text-hint'}>{titleError || 'До 200 символов.'}</p>
        {editing && <Field label="Статус"><Select value={form.status} onChange={set('status')}>{CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{campaignStatusLabels[status]}</option>)}</Select></Field>}
        {editing && ['finished', 'abandoned'].includes(form.status) && form.status !== campaign.status && <p className="campaign-warning" role="note">Завершение кампании снимет активных персонажей с игры: они станут свободны для других столов.</p>}
        <Field label="Публичная кампания"><Select value={form.public_campaign_id} onChange={set('public_campaign_id')}><option value="">Без публичной кампании</option>{presets.map((preset) => <option key={preset.id} value={String(preset.id)}>{preset.title}{preset.status !== 'published' ? ` · ${publicCampaignStatusLabels[preset.status]}` : ''}</option>)}</Select></Field>
        <div className="space-y-1.5">
          <span className="text-label">Описание</span>
          <RichTextEditor value={form.description_markdown} onChange={set('description_markdown')} extraTools={[SECRET_TOOL]} rows={8} ariaLabel="Описание кампании" placeholder="Завязка, тон, правила стола…" />
          <p className="text-hint">Блоки «Секрет мастера» игроки не увидят.</p>
        </div>
        {mutation.error && <ErrorBox error={toCampaignError(mutation.error)} onRetry={() => mutation.reset()} />}
      </form>
    </Drawer>
  )
}
