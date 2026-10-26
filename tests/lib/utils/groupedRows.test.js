import { describe, expect, it } from 'vitest'
import { groupRows, replaceGroupRows } from '@/lib/utils/groupedRows.js'

const rows = [
  { id: 5, suggestion_type: 'IDEAL', text: 'Честь' },
  { id: 2, suggestion_type: 'IDEAL', text: 'Свобода' },
  { id: 9, suggestion_type: 'FLAW', text: 'Жадность' },
]

describe('groupedRows', () => {
  it('orders a group by id', () => {
    expect(groupRows(rows, 'suggestion_type', 'IDEAL').map((r) => r.text)).toEqual(['Свобода', 'Честь'])
  })

  it('a reorder rewrites texts onto the existing ids (order is stored by id)', () => {
    const next = replaceGroupRows(rows, 'suggestion_type', 'IDEAL', 'text', ['Честь', 'Свобода'])
    expect(next).toEqual([
      { id: 9, suggestion_type: 'FLAW', text: 'Жадность' },
      { id: 2, suggestion_type: 'IDEAL', text: 'Честь' },
      { id: 5, suggestion_type: 'IDEAL', text: 'Свобода' },
    ])
  })

  it('extra texts become new rows, missing ones drop ids, blanks are skipped', () => {
    expect(replaceGroupRows(rows, 'suggestion_type', 'IDEAL', 'text', ['А', ' ', 'Б', 'В']).filter((r) => r.suggestion_type === 'IDEAL'))
      .toEqual([
        { id: 2, suggestion_type: 'IDEAL', text: 'А' },
        { id: 5, suggestion_type: 'IDEAL', text: 'Б' },
        { suggestion_type: 'IDEAL', text: 'В' },
      ])
    expect(replaceGroupRows(rows, 'suggestion_type', 'IDEAL', 'text', ['Одно']).filter((r) => r.suggestion_type === 'IDEAL'))
      .toEqual([{ id: 2, suggestion_type: 'IDEAL', text: 'Одно' }])
  })
})
