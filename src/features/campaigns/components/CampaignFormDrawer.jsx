import { useState } from 'react'
import { Button, ErrorBox, Field, Input, Select } from '@/components/ui'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import { campaignStatusLabels } from '@/lib/i18n/index.js'
import { CAMPAIGN_STATUSES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCreateCampaign, usePresetOptions, useUpdateCampaign } from '@/features/campaigns/queries.js'
import PresetPickerDrawer from './PresetPickerDrawer.jsx'

const fromCampaign = (campaign) => ({
  title: campaign?.title ?? '',
  status: campaign?.status ?? 'planning',
  public_campaign: campaign?.public_campaign ?? null,
})

// Новая кампания или правка своей: при создании из пресета пустые название и описание бэк возьмёт из него.
// Своё описание ГМ пишет потом, во вкладке «Обзор» кампании.
// extra — блок под формой (страница кампании кладёт туда архив).
export default function CampaignFormDrawer({ campaign, presetId, onClose, onSaved, extra }) {
  const editing = Boolean(campaign)
  const [form, setForm] = useState(() => ({ ...fromCampaign(campaign), ...(presetId ? { public_campaign: { id: presetId } } : {}) }))
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const mutation = editing ? update : create
  // Название пресета, переданного одним id, — из списка; в остальных случаях объект уже с названием.
  const { data: presets = [] } = usePresetOptions({ enabled: Boolean(presetId) })
  const [picking, setPicking] = useState(false)
  const chosen = form.public_campaign && { ...form.public_campaign, title: form.public_campaign.title ?? presets.find((preset) => preset.id === form.public_campaign.id)?.title }
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const fromPreset = Boolean(form.public_campaign)
  const titleError = !form.title.trim() && !(fromPreset && !editing) ? 'Укажите название или выберите публичную кампанию — название возьмётся из неё.' : ''

  const save = (event) => {
    event.preventDefault()
    if (titleError || mutation.isPending) return
    const body = {
      title: form.title.trim() || undefined,
      public_campaign_id: form.public_campaign ? form.public_campaign.id : editing ? null : undefined,
      ...(editing ? { status: form.status } : {}),
    }
    mutation.mutate(editing ? { id: campaign.id, ...body } : body, { onSuccess: (saved) => onSaved?.(saved) })
  }

  return (
    <Drawer title={editing ? 'Настройки кампании' : 'Новая кампания'} subtitle={editing ? campaign.title : 'Стол, который вы будете вести.'} onClose={picking ? () => {} : onClose} closeLabel="Закрыть форму кампании" footer={
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
        <div className="space-y-1.5">
          <span className="text-label" id="campaign-preset-label">Публичная кампания</span>
          {/* Одно значение — поле как у Select, выбор в боковой панели («Без публичной кампании» — там же). */}
          <button type="button" aria-labelledby="campaign-preset-label campaign-preset-value" aria-haspopup="dialog" onClick={() => setPicking(true)} className="flex w-full items-center justify-between gap-2 rounded border border-stone-700 bg-stone-800/70 px-3 py-2 text-sm outline-none transition hover:border-stone-600 focus:border-ember">
            <span id="campaign-preset-value" className={`truncate pr-2 ${chosen ? 'text-stone-100' : 'text-stone-500'}`}>{chosen ? chosen.title ?? '…' : 'Без публичной кампании'}</span>
            <LoreIcon name="chevron" className="size-4 shrink-0 rotate-90 text-stone-400" />
          </button>
        </div>
        {mutation.error && <ErrorBox error={toCampaignError(mutation.error)} onRetry={() => mutation.reset()} />}
      </form>
      {extra}
      {picking && <PresetPickerDrawer value={chosen} onClose={() => setPicking(false)} onPick={(preset) => { setForm((current) => ({ ...current, public_campaign: preset && { id: preset.id, title: preset.title } })); setPicking(false) }} />}
    </Drawer>
  )
}
