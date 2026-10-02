import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleText from '@/features/articles/components/ArticleText.jsx'

describe('ArticleText', () => {
  it('renders :::gm blocks as a GM-only box instead of raw markers', () => {
    render(<ArticleText value={'До\n\n:::gm\n\nТайна\n\n:::\n\nПосле'} />)
    expect(screen.queryByText(/:::/)).not.toBeInTheDocument()
    expect(screen.getByText('Только для мастера')).toBeVisible()
    expect(screen.getByText('Тайна').closest('aside')).toHaveClass('lore-secret')
    expect(screen.getByText('После')).toBeVisible()
  })
})
