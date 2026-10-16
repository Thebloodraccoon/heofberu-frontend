import { describe, expect, it } from 'vitest'
import { allowedStatusMoves, needsConfirmation } from '@/features/campaigns/rosterRules.js'
import { campaignErrorMessage, toCampaignError } from '@/features/campaigns/errors.js'
import { isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'

const backendError = (status, type, message = 'English message') => Object.assign(new Error(message), { status, data: { error: { type, message, status_code: status } } })

describe('roster status rule', () => {
  it.each([
    ['active', ['dead', 'retired', 'removed']],
    ['dead', ['removed']],
    ['retired', ['removed']],
    ['removed', []],
  ])('lets %s move to %j only', (current, moves) => {
    expect(allowedStatusMoves(current)).toEqual(moves)
  })

  it('asks before removing a character', () => {
    expect(needsConfirmation('removed')).toBe(true)
    expect(needsConfirmation('dead')).toBe(false)
  })
})

describe('campaign errors', () => {
  it('translates known backend exceptions by type and keeps status and data', () => {
    const error = toCampaignError(backendError(409, 'CharacterNotFreeException'))
    expect(error.message).toBe('Персонаж уже играет в другой кампании.')
    expect(error.status).toBe(409)
    expect(error.data.error.type).toBe('CharacterNotFreeException')
  })

  it('falls back to a status message, or keeps unknown errors as they are when asked', () => {
    expect(campaignErrorMessage(backendError(403, 'SomethingElse'))).toBe('Недостаточно прав для этого действия.')
    expect(campaignErrorMessage(backendError(403, 'SomethingElse'), { onlyKnown: true })).toBe('English message')
    expect(campaignErrorMessage(backendError(403, 'CharacterAccessDeniedException'), { onlyKnown: true })).toMatch(/не в вашей кампании/)
    expect(toCampaignError(null)).toBeNull()
  })
})

describe('campaign role helpers', () => {
  it('trusts the campaign view, not the global role', () => {
    expect(isCampaignGm({ viewer_role: 'gm' })).toBe(true)
    expect(isCampaignGm({ viewer_role: 'player' })).toBe(false)
  })

  it('treats finished, abandoned and archived campaigns as closed', () => {
    expect(isCampaignClosed({ status: 'active' })).toBe(false)
    expect(isCampaignClosed({ status: 'finished' })).toBe(true)
    expect(isCampaignClosed({ status: 'active', archived_at: '2099-01-01T00:00:00Z' })).toBe(true)
  })
})
