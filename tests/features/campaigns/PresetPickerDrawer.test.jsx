import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PresetPickerDrawer from '@/features/campaigns/components/PresetPickerDrawer.jsx'

const state = vi.hoisted(() => ({ params: [] }))
vi.mock('@/features/articles/queries.js', () => ({ useTagSearch: () => ({ data: { items: [{ id: 3, name: 'море', usage_count: 2 }] }, isLoading: false }) }))
vi.mock('@/features/campaigns/queries.js', () => ({
  usePublicCampaignsPage: (params) => { state.params.push(params); return { data: { items: [{ id: 9, title: 'Проклятие маяка', pitch: 'Шторм.', status: 'published', tags: [{ id: 3, name: 'море' }] }], total: 1 }, isLoading: false } },
}))

describe('public campaign picker', () => {
  it('filters by tags in the filters drawer and picks a campaign or none', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(<PresetPickerDrawer value={null} onPick={onPick} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Фильтры' }))
    await user.click(screen.getByRole('button', { name: /^#море/ }))
    await user.click(screen.getByRole('button', { name: 'Применить' }))
    expect(state.params.at(-1)).toMatchObject({ tag_id: [3] })
    await user.click(screen.getByRole('button', { name: /Проклятие маяка/ }))
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ id: 9 }))
    await user.click(screen.getByRole('button', { name: 'Без публичной кампании' }))
    expect(onPick).toHaveBeenLastCalledWith(null)
  })
})
