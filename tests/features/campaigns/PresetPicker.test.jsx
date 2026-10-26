import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import PresetPicker from '@/features/campaigns/components/PresetPicker.jsx'
import { publicCampaignsApi } from '@/features/campaigns/api.js'

vi.mock('@/features/articles/queries.js', () => ({ useTagSearch: () => ({ data: { items: [{ id: 3, name: 'море', usage_count: 2 }] }, isLoading: false }) }))

describe('inline public campaign picker', () => {
  it('filters by tags in the narrow filter drawer and picks a campaign', async () => {
    vi.spyOn(publicCampaignsApi, 'list').mockResolvedValue({ items: [{ id: 9, title: 'Проклятие маяка', pitch: 'Шторм.', status: 'published', tags: [{ id: 3, name: 'море' }] }], total: 1 })
    const onPick = vi.fn()
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderWithProviders(<PresetPicker value={null} onPick={onPick} onBack={onBack} backLabel="К настройкам" />, { auth: false })
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    expect(screen.getByRole('dialog', { name: 'Фильтры кампаний' })).toHaveClass('ui-drawer--filters')
    await user.click(screen.getByRole('button', { name: /^#море/ }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    await waitFor(() => expect(publicCampaignsApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ tag_id: [3], page: 1 })))
    await user.click(await screen.findByRole('button', { name: /Проклятие маяка/ }))
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ id: 9 }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'К настройкам' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
