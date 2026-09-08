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
})
