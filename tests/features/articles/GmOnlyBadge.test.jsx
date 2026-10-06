import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import GmOnlyBadge from '@/features/articles/components/GmOnlyBadge.jsx'

describe('GmOnlyBadge', () => {
  it('shows the open-eye icon with either label and no lock emoji', () => {
    const { rerender } = render(<GmOnlyBadge />)
    const badge = screen.getByText('ГМ')
    expect(badge).toHaveAttribute('data-tone', 'violet')
    expect(badge.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(badge.querySelector('path')).toHaveAttribute('d', expect.stringContaining('M2 12s3.5-7'))
    expect(badge).not.toHaveTextContent('🔒')

    rerender(<GmOnlyBadge>Только для ГМ</GmOnlyBadge>)
    expect(screen.getByText('Только для ГМ').querySelector('svg')).toBeInTheDocument()
  })
})
