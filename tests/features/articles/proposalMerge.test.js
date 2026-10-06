import { describe, expect, it } from 'vitest'
import { hasConflictMarkers, mergeConflicts, mergeField } from '@/features/articles/proposalMerge.js'

describe('proposalMerge', () => {
  it('detects leftover diff3 markers only at line starts', () => {
    expect(hasConflictMarkers('a\n<<<<<<< current\nb\n=======\nc\n>>>>>>> proposal')).toBe(true)
    expect(hasConflictMarkers('a\n||||||| base\nb')).toBe(true)
    expect(hasConflictMarkers('Заголовок\n=======')).toBe(true)
    expect(hasConflictMarkers('текст про <<<<<<< внутри строки и ======= тоже')).toBe(false)
    expect(hasConflictMarkers('')).toBe(false)
  })

  it('reads conflicts from the error envelope details, ignoring other 409s', () => {
    const details = { conflicts: [{ field: 'title' }], body_conflicts: [], merged_body: 'x' }
    expect(mergeConflicts({ status: 409, data: { error: { details } } })).toBe(details)
    expect(mergeConflicts({ status: 409, data: { error: { message: 'closed' } } })).toBeNull()
    expect(mergeConflicts({ status: 400, data: { error: { details } } })).toBeNull()
  })

  it('takes the proposed value only for fields the proposal changed', () => {
    expect(mergeField('a', 'b', 'a')).toBe('b')
    expect(mergeField('a', 'a', 'c')).toBe('c')
    expect(mergeField(null, 'b', undefined)).toBe('b')
  })
})
