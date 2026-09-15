import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RichText } from '@/components/ui/RichText.jsx'

describe('RichText', () => {
  it('renders sanitized HTML content', () => {
    const { container } = render(<RichText value="<p><strong>Жирный</strong> текст</p>" />)
    expect(screen.getByText('текст', { exact: false })).toBeInTheDocument()
    expect(container.querySelector('strong')).toHaveTextContent('Жирный')
  })

  it('strips disallowed tags and event handlers', () => {
    const { container } = render(<RichText value='<p onclick="x()">Текст</p><script>alert(1)</script>' />)
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container.querySelector('[onclick]')).not.toBeInTheDocument()
  })

  it('renders legacy plain text as a paragraph', () => {
    render(<RichText value="Просто текст" />)
    expect(screen.getByText('Просто текст')).toBeInTheDocument()
  })

  it('shows the empty fallback when there is no value', () => {
    render(<RichText value="" empty="Нет описания" />)
    expect(screen.getByText('Нет описания')).toBeInTheDocument()
  })

  it('renders HTML tags in tail (effects_summary) instead of showing them as literal text', () => {
    const { container } = render(
      <RichText value="<p>Описание</p>" tail="<ul><li>Сила +1</li><li>Телосложение +1</li></ul>" />,
    )
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Сила +1')
    expect(container.textContent).not.toContain('<ul>')
  })

  it('renders a plain-text tail like legacy description text', () => {
    render(<RichText value="<p>Описание</p>" tail="Просто текст резюме" />)
    expect(screen.getByText('Просто текст резюме')).toBeInTheDocument()
  })

  it('inserts a blank paragraph before the tail when there is a body', () => {
    const { container } = render(<RichText value="<p>Описание</p>" tail="Резюме" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[1]).toHaveTextContent('')
    expect(paragraphs[1].querySelector('br')).toBeInTheDocument()
    expect(paragraphs[2]).toHaveTextContent('Резюме')
  })

  it('skips the blank paragraph when there is no body, just a tail', () => {
    const { container } = render(<RichText value="" tail="Резюме" />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(1)
    expect(paragraphs[0]).toHaveTextContent('Резюме')
  })
})
