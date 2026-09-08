import { describe, expect, it } from 'vitest'
import { looksLikeHtml, sanitizeHtml, toEditableHtml, toPlainText } from '@/lib/utils/richText.js'

describe('looksLikeHtml', () => {
  it('detects tags', () => {
    expect(looksLikeHtml('<p>hi</p>')).toBe(true)
    expect(looksLikeHtml('plain text')).toBe(false)
    expect(looksLikeHtml('')).toBe(false)
    expect(looksLikeHtml(null)).toBe(false)
  })
})

describe('toEditableHtml', () => {
  it('returns empty string for empty input', () => {
    expect(toEditableHtml('')).toBe('')
    expect(toEditableHtml(null)).toBe('')
  })

  it('passes through content that already looks like HTML', () => {
    expect(toEditableHtml('<p>Уже HTML</p>')).toBe('<p>Уже HTML</p>')
  })

  it('wraps legacy plain text into paragraphs and preserves line breaks', () => {
    expect(toEditableHtml('Первый абзац\n\nВторой абзац')).toBe(
      '<p>Первый абзац</p><p>Второй абзац</p>',
    )
    expect(toEditableHtml('строка1\nстрока2')).toBe('<p>строка1<br>строка2</p>')
  })
})

describe('sanitizeHtml', () => {
  it('keeps allowed formatting tags', () => {
    expect(sanitizeHtml('<p><strong>Жирный</strong> и <em>курсив</em></p>')).toBe(
      '<p><strong>Жирный</strong> и <em>курсив</em></p>',
    )
  })

  it('strips scripts and event handler attributes', () => {
    const dirty = '<p onclick="alert(1)">Текст<script>alert(2)</script></p><img src=x onerror="alert(3)">'
    const clean = sanitizeHtml(dirty)
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('onclick')
    expect(clean).not.toContain('onerror')
    expect(clean).not.toContain('<img')
    expect(clean).toContain('Текст')
  })

  it('blocks javascript: links', () => {
    const clean = sanitizeHtml('<a href="javascript:alert(1)">клик</a>')
    expect(clean).not.toContain('javascript:')
  })

  it('forces noopener/noreferrer on links that open in a new tab', () => {
    const clean = sanitizeHtml('<a href="https://example.com" target="_blank">ссылка</a>')
    expect(clean).toContain('rel="noopener noreferrer"')
  })

  it('keeps only the safe subset of a style declaration', () => {
    const clean = sanitizeHtml('<p style="text-align: center; background: url(javascript:alert(1))">x</p>')
    expect(clean).toContain('text-align: center')
    expect(clean).not.toContain('url(')
    expect(clean).not.toContain('background')
  })

  it('drops indent margin-left values outside the expected format', () => {
    const clean = sanitizeHtml('<p style="margin-left: 3em">ok</p><p style="margin-left: expression(alert(1))">bad</p>')
    expect(clean).toContain('margin-left: 3em')
    expect(clean).not.toContain('expression')
  })

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
  })
})

describe('toPlainText', () => {
  it('returns plain text unchanged', () => {
    expect(toPlainText('просто текст')).toBe('просто текст')
  })

  it('strips tags and collapses whitespace for HTML content', () => {
    expect(toPlainText('<p>Первый</p>\n<p>Второй  абзац</p>')).toBe('Первый Второй абзац')
  })

  it('returns an empty string for empty input', () => {
    expect(toPlainText('')).toBe('')
    expect(toPlainText(null)).toBe('')
  })
})
