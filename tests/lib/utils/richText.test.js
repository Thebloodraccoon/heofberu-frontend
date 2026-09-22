import { describe, expect, it } from 'vitest'
import { looksLikeHtml, renderRichHtml, sanitizeHtml, toEditorContent, toPlainText } from '@/lib/utils/richText.js'

describe('looksLikeHtml', () => {
  it('detects tags', () => {
    expect(looksLikeHtml('<p>hi</p>')).toBe(true)
    expect(looksLikeHtml('plain text')).toBe(false)
    expect(looksLikeHtml('')).toBe(false)
    expect(looksLikeHtml(null)).toBe(false)
  })
})

describe('looksLikeHtml vs Markdown', () => {
  it('does not treat Markdown autolinks or comparisons as legacy HTML', () => {
    expect(looksLikeHtml('см. <https://example.com>')).toBe(false)
    expect(looksLikeHtml('a < b и b > c')).toBe(false)
  })
})

describe('renderRichHtml', () => {
  it('returns empty string for empty input', () => {
    expect(renderRichHtml('')).toBe('')
    expect(renderRichHtml(null)).toBe('')
  })

  it('renders Markdown formatting, lists and headings', () => {
    const html = renderRichHtml('# Заголовок\n\n**жирный** и *курсив*\n\n- раз\n- два')
    expect(html).toContain('<h1>Заголовок</h1>')
    expect(html).toContain('<strong>жирный</strong>')
    expect(html).toContain('<em>курсив</em>')
    expect(html).toContain('<li>раз</li>')
  })

  it('keeps single line breaks as <br> (legacy plain-text look)', () => {
    expect(renderRichHtml('строка1\nстрока2')).toBe('<p>строка1<br>строка2</p>')
  })

  it('escapes raw HTML inside Markdown instead of passing it through', () => {
    const html = renderRichHtml('текст\n\n<div onclick="x()">блок</div>\n\n<script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<div')
    expect(html).toContain('&lt;script&gt;')
  })

  it('blocks javascript: links and data: images', () => {
    const html = renderRichHtml('[клик](javascript:alert(1)) ![x](data:image/svg+xml;base64,AAAA)')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('data:')
  })

  it('keeps https images and forces lazy loading', () => {
    const html = renderRichHtml('![Врата](https://cdn.example.com/a.png)')
    expect(html).toContain('src="https://cdn.example.com/a.png"')
    expect(html).toContain('alt="Врата"')
    expect(html).toContain('loading="lazy"')
  })

  it('renders legacy HTML values as before', () => {
    expect(renderRichHtml('<p><strong>Старый</strong></p>')).toBe('<p><strong>Старый</strong></p>')
  })
})

describe('toEditorContent', () => {
  it('loads legacy HTML as html and everything else as markdown', () => {
    expect(toEditorContent('<p>Старый</p>')).toEqual({ content: '<p>Старый</p>', contentType: 'html' })
    expect(toEditorContent('**новый**')).toEqual({ content: '**новый**', contentType: 'markdown' })
    expect(toEditorContent('')).toEqual({ content: '', contentType: 'markdown' })
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

  it('trims leading/trailing empty paragraphs left by ProseMirror', () => {
    expect(sanitizeHtml('<p></p><p>Текст</p><p><br></p>')).toBe('<p>Текст</p>')
    expect(sanitizeHtml('<p><br></p><p><br></p><p>Текст</p>')).toBe('<p>Текст</p>')
  })

  it('collapses a fully empty document to an empty string', () => {
    expect(sanitizeHtml('<p></p>')).toBe('')
    expect(sanitizeHtml('<p><br></p>')).toBe('')
  })

  it('never trims empty paragraphs in the middle of the document', () => {
    expect(sanitizeHtml('<p>Раз</p><p></p><p>Два</p>')).toBe('<p>Раз</p><p></p><p>Два</p>')
  })

  it('does not treat a leading/trailing hr or table as empty', () => {
    expect(sanitizeHtml('<hr><p>Текст</p>')).toBe('<hr><p>Текст</p>')
  })
})

describe('toPlainText', () => {
  it('returns plain text unchanged', () => {
    expect(toPlainText('просто текст')).toBe('просто текст')
  })

  it('strips Markdown syntax for previews', () => {
    expect(toPlainText('# Заголовок\n\n**жирный** текст')).toBe('Заголовок жирный текст')
  })

  it('strips tags and collapses whitespace for HTML content', () => {
    expect(toPlainText('<p>Первый</p>\n<p>Второй  абзац</p>')).toBe('Первый Второй абзац')
  })

  it('returns an empty string for empty input', () => {
    expect(toPlainText('')).toBe('')
    expect(toPlainText(null)).toBe('')
  })
})
