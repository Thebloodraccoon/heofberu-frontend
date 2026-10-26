import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import CampaignFormDrawer from '@/features/campaigns/components/CampaignFormDrawer.jsx'
import { publicCampaignsApi } from '@/features/campaigns/api.js'

const state = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), pending: false, error: null, params: [], queryError: null, retry: vi.fn() }))
const presets = [
  { id: 9, title: 'Проклятие маяка', author: { username: 'Ария' }, status: 'published', pitch: 'Шторм.\n:::gm\nТайна.\n:::', tags: [] },
  { id: 10, title: 'Тихая гавань', status: 'published', pitch: '', tags: [] },
]
vi.mock('@/features/articles/queries.js', () => ({ useTagSearch: () => ({ data: { items: [] }, isLoading: false }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  useCreateCampaign: () => ({ mutate: state.create, isPending: state.pending, error: state.error }),
  useUpdateCampaign: () => ({ mutate: state.update, isPending: state.pending, error: state.error }),
}))

const campaign = { id: 1, title: 'Нова', status: 'active', public_campaign: null }
function setup(props = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const result = renderWithProviders(<CampaignFormDrawer onClose={onClose} onSaved={onSaved} {...props} />, { auth: false })
  return { ...result, user: userEvent.setup(), onClose, onSaved }
}
async function chooseStatus(user, name) {
  await user.click(screen.getByRole('button', { name: 'Состояние игры' }))
  await user.click(screen.getByRole('option', { name }))
}

describe('table creation and settings drawer', () => {
  beforeEach(() => {
    state.pending = false
    state.error = null
    state.queryError = null
    state.params = []
    vi.spyOn(publicCampaignsApi, 'list').mockReset().mockImplementation((params) => {
      state.params.push(params)
      return Promise.resolve({ items: params.page === 1 ? presets : [{ ...presets[1], id: 11, title: 'Последняя история' }], total: 11 })
    })
  })

  it('validates after blur and creates an independent table with a trimmed title', async () => {
    const { user, onSaved } = setup()
    expect(screen.queryByText('Укажите название стола.')).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Название стола' })
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('button', { name: 'Создать стол' })).toBeDisabled()
    await user.click(input)
    await user.tab()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await user.type(input, '  Моя история  ')
    await user.click(screen.getByRole('button', { name: 'Создать стол' }))
    expect(state.create).toHaveBeenCalledWith({ title: 'Моя история', public_campaign_id: undefined }, { onSuccess: onSaved })
  })

  it('chooses a source in the same drawer, suggests its title and hides master secrets', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Публичная кампания/ }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'К созданию стола' })).toHaveFocus()
    await user.click(await screen.findByRole('button', { name: /Проклятие маяка/ }))
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Проклятие маяка')
    expect(screen.getByText('@Ария')).toBeVisible()
    expect(screen.queryByText('Тайна.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.click(await screen.findByRole('button', { name: 'Тихая гавань' }))
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Тихая гавань')
    await user.click(screen.getByRole('button', { name: 'Создать стол' }))
    expect(state.create).toHaveBeenCalledWith({ title: 'Тихая гавань', public_campaign_id: 10 }, expect.any(Object))
  })

  it('preserves a custom title through source selection and picker cancellation', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('textbox', { name: 'Название стола' }), 'Моя группа')
    await user.click(screen.getByRole('button', { name: /Публичная кампания/ }))
    await user.click(screen.getByRole('button', { name: 'Назад', exact: true }))
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Моя группа')
    await user.click(screen.getByRole('button', { name: /Выбрать публичную кампанию/ }))
    await user.click(await screen.findByRole('button', { name: /Проклятие маяка/ }))
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Моя группа')
  })

  it('searches and loads sources beyond the first page on scroll', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /Публичная кампания/ }))
    const list = (await screen.findByRole('list', { name: 'Найденные публичные кампании' })).parentElement
    act(() => { list.dispatchEvent(new Event('scroll')) })
    expect(await screen.findByRole('button', { name: 'Последняя история' })).toBeVisible()
    expect(state.params.at(-1)).toMatchObject({ page: 2, size: 10 })
    await user.type(screen.getByRole('searchbox'), '  море  ')
    await user.click(screen.getByRole('button', { name: 'Найти публичные кампании' }))
    await waitFor(() => expect(state.params.at(-1)).toMatchObject({ q: 'море', page: 1 }))
  })

  it('opens an initial full source without making the form dirty', async () => {
    const { user, onClose } = setup({ preset: presets[0] })
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Проклятие маяка')
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it.each(['escape', 'button', 'overlay'])('warns before dismissing a dirty form via %s and preserves it on cancel', async (method) => {
    const { user, onClose } = setup()
    const input = screen.getByRole('textbox', { name: 'Название стола' })
    await user.type(input, 'Несохранённое')
    if (method === 'escape') await user.keyboard('{Escape}')
    else if (method === 'button') await user.click(screen.getByRole('button', { name: 'Закрыть форму кампании' }))
    else fireEvent.click(document.querySelector('.ui-drawer-overlay'))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Закрыть без сохранения?' }))
    expect(dialog.getByRole('button', { name: 'Остаться' })).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(dialog.getByRole('button', { name: 'Не сохранять' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(input).toHaveValue('Несохранённое')
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    await user.click(screen.getByRole('button', { name: 'Не сохранять' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(state.create).not.toHaveBeenCalled()
  })

  it('saves settings only when changed and removes a source with explicit null', async () => {
    const { user } = setup({ campaign: { ...campaign, public_campaign: presets[0] } })
    expect(screen.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Убрать' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить', exact: true }))
    expect(state.update).toHaveBeenCalledWith({ id: 1, title: 'Нова', status: 'active', public_campaign_id: null }, expect.any(Object))
    expect(state.create).not.toHaveBeenCalled()
  })

  it.each(['Завершена', 'Заброшена'])('confirms %s before releasing active characters', async (status) => {
    const { user } = setup({ campaign })
    await chooseStatus(user, status)
    await user.click(screen.getByRole('button', { name: 'Сохранить', exact: true }))
    expect(state.update).not.toHaveBeenCalled()
    const dialog = within(screen.getByRole('alertdialog'))
    expect(dialog.getByText(/Активные персонажи будут сняты/)).toBeVisible()
    await user.click(dialog.getByRole('button', { name: 'Сохранить' }))
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ status: status === 'Завершена' ? 'finished' : 'abandoned' }), expect.any(Object))
  })

  it('confirms archiving with unsaved settings without sending an update', async () => {
    const run = vi.fn()
    const { user } = setup({ campaign, archiveAction: { run } })
    await user.type(screen.getByRole('textbox', { name: 'Название стола' }), '!')
    await user.click(screen.getByRole('button', { name: 'В архив' }))
    const dialog = within(screen.getByRole('alertdialog', { name: 'Отправить стол в архив?' }))
    expect(dialog.getByText(/Несохранённые изменения настроек будут отменены/)).toBeVisible()
    await user.click(dialog.getByRole('button', { name: 'В архив' }))
    expect(run).toHaveBeenCalledOnce()
    expect(state.update).not.toHaveBeenCalled()
  })

  it('confirms restoring a table and keeps the original title', async () => {
    const run = vi.fn()
    const { user } = setup({ campaign: { ...campaign, archived_at: '2026-10-01' }, restoreAction: { run } })
    await user.click(screen.getByRole('button', { name: 'Вернуть из архива' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Вернуть из архива' }))
    expect(run).toHaveBeenCalledOnce()
    expect(state.update).not.toHaveBeenCalled()
  })

  it('keeps the draft on server errors and retries with its current values', async () => {
    state.error = new Error('Сервер недоступен')
    const { user } = setup({ campaign })
    await user.type(screen.getByRole('textbox', { name: 'Название стола' }), ' 2')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Нова 2' }), expect.any(Object))
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toHaveValue('Нова 2')
  })

  it('prevents closing and repeated writes while saving', async () => {
    state.pending = true
    const { user, onClose } = setup({ campaign })
    expect(screen.getByRole('textbox', { name: 'Название стола' })).toBeDisabled()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Закрыть форму кампании' }))
    fireEvent.submit(document.getElementById('campaign-form'))
    expect(onClose).not.toHaveBeenCalled()
    expect(state.update).not.toHaveBeenCalled()
  })
})
