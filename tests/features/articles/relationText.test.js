import { describe, expect, it } from 'vitest'
import { groupRelations, relationCaption } from '@/features/articles/relationText.js'

const rel = (id, relation_type, direction) => ({ id, relation_type, direction, article: { id: id * 10, title: `A${id}` } })

describe('relationCaption', () => {
  it('names each side of a directed relation from the current article', () => {
    expect(relationCaption('RULES', 'incoming')).toBe('Правитель')
    expect(relationCaption('LOCATED_IN', 'incoming')).toBe('Находится здесь')
    expect(relationCaption('LOCATED_IN', 'outgoing')).toBe('Находится в')
  })

  it('falls back to the raw label for an unknown type', () => {
    expect(relationCaption('SOMETHING_NEW', 'incoming')).toBe('SOMETHING_NEW')
  })
})

describe('groupRelations', () => {
  it('groups by caption, orders facts first and mentions last', () => {
    const sections = groupRelations([
      rel(1, 'SEE_ALSO', 'outgoing'),
      rel(2, 'LOCATED_IN', 'incoming'),
      rel(3, 'RULES', 'incoming'),
      rel(4, 'LOCATED_IN', 'incoming'),
    ])

    expect(sections.map((s) => s.title)).toEqual(['Правитель', 'Находится здесь', 'Смотрите также'])
    expect(sections[1].items.map((r) => r.id)).toEqual([2, 4])
    expect(sections.map((s) => s.fact)).toEqual([true, false, false])
  })

  it('merges both directions of a symmetric relation into one group', () => {
    const sections = groupRelations([rel(1, 'ALLY_OF', 'outgoing'), rel(2, 'ALLY_OF', 'incoming')])

    expect(sections).toHaveLength(1)
    expect(sections[0].title).toBe('Союзник')
    expect(sections[0].items.map((r) => r.id)).toEqual([1, 2])
  })

  it('puts unknown relation types after the known ones', () => {
    const sections = groupRelations([rel(1, 'SOMETHING_NEW', 'outgoing'), rel(2, 'SEE_ALSO', 'outgoing')])

    expect(sections.map((s) => s.title)).toEqual(['Смотрите также', 'SOMETHING_NEW'])
  })
})
