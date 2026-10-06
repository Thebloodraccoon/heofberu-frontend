import { describe, expect, it } from 'vitest'
import { splitGmBlocks, stripGmBlocks } from '@/features/articles/secrets.js'

describe('article GM blocks', () => {
  const body = 'Публично А.\n\n:::gm\n\nОн шпион культа.\n\n:::\n\nПублично Б.'

  it('splits public text and secrets in order', () => {
    const segments = splitGmBlocks(body)
    expect(segments.map((s) => s.secret)).toEqual([false, true, false])
    expect(segments[1].text).toContain('Он шпион культа.')
  })

  it('strips secrets for the player view', () => {
    const stripped = stripGmBlocks(body)
    expect(stripped).not.toContain('шпион')
    expect(stripped).toContain('Публично А.')
    expect(stripped).toContain('Публично Б.')
  })

  it('treats an unclosed block as secret to the end (fail closed, like the backend)', () => {
    expect(stripGmBlocks('Видно\n:::gm\nсекрет до конца')).toBe('Видно\n')
    expect(splitGmBlocks('Видно\n:::gm\nсекрет').at(-1).secret).toBe(true)
  })

  it('leaves text without secrets untouched', () => {
    expect(splitGmBlocks('Просто текст')).toEqual([{ secret: false, text: 'Просто текст' }])
  })
})
