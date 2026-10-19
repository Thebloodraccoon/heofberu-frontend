import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api/httpClient.js', () => ({ default: vi.fn().mockResolvedValue({}) }))
import request from '@/lib/api/httpClient.js'
import { campaignsApi, characterVisibilityApi, publicCampaignsApi } from '@/features/campaigns/api.js'

describe('campaignsApi', () => {
  beforeEach(() => request.mockClear())

  it('adds a character by id and changes a participation status', async () => {
    await campaignsApi.roster.add(5, 42)
    await campaignsApi.roster.setStatus(5, 7, 'removed')
    expect(request).toHaveBeenNthCalledWith(1, '/campaigns/5/characters', { method: 'POST', body: { character_id: 42 } })
    expect(request).toHaveBeenNthCalledWith(2, '/campaigns/5/characters/7', { method: 'PATCH', body: { status: 'removed' } })
  })

  it('replaces attendance with participation ids', async () => {
    await campaignsApi.sessions.setAttendance(5, 3, [7, 8])
    expect(request).toHaveBeenCalledWith('/campaigns/5/sessions/3/attendance', { method: 'PUT', body: { participation_ids: [7, 8] } })
  })

  it('reads the schedule across campaigns and writes reviews with PUT', async () => {
    await campaignsApi.schedule({ include_cancelled: true, page: 1 })
    await campaignsApi.reviews.session.write(5, 3, { body: 'Отлично', visible_to_table: true })
    expect(request).toHaveBeenNthCalledWith(1, '/campaigns/schedule', { params: { include_cancelled: true, page: 1 } })
    expect(request).toHaveBeenNthCalledWith(2, '/campaigns/5/sessions/3/review', { method: 'PUT', body: { body: 'Отлично', visible_to_table: true } })
  })
})

describe('publicCampaignsApi', () => {
  beforeEach(() => request.mockClear())

  it('reads a preset by slug and moves it through status actions', async () => {
    await publicCampaignsApi.getBySlug('proklyatie-mayaka')
    await publicCampaignsApi.publish(9)
    expect(request).toHaveBeenNthCalledWith(1, '/public-campaigns/by-slug/proklyatie-mayaka')
    expect(request).toHaveBeenNthCalledWith(2, '/public-campaigns/9/publish', { method: 'POST' })
  })

  it('replaces article links as a whole', async () => {
    await publicCampaignsApi.articles.replace(9, [{ article_id: 1, position: 0, note: null }])
    expect(request).toHaveBeenCalledWith('/public-campaigns/9/articles', { method: 'PUT', body: { articles: [{ article_id: 1, position: 0, note: null }] } })
  })

  it('sets character visibility for the owner and reads the open card', async () => {
    await characterVisibilityApi.set(12, 'full')
    await characterVisibilityApi.card(12)
    expect(request).toHaveBeenNthCalledWith(1, '/characters/12/public-visibility', { method: 'PATCH', body: { public_visibility: 'full' } })
    expect(request).toHaveBeenNthCalledWith(2, '/characters/12/public', { auth: false })
  })
})
