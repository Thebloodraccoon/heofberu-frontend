import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import Drawer from '@/components/ui/Drawer.jsx'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import FilterDrawer from '@/features/campaigns/components/FilterDrawer.jsx'

describe('Drawer width variants', () => {
  it('a regular drawer has the standard width; filter-only drawers opt into the narrower one', () => {
    renderWithProviders(<Drawer title="Обычная" onClose={vi.fn()}>x</Drawer>, { auth: false })
    expect(screen.getByRole('dialog', { name: 'Обычная' })).not.toHaveClass('ui-drawer--filters')
  })

  it('catalog FilterModal and campaigns FilterDrawer use variant="filters"', () => {
    renderWithProviders(<FilterModal filters={[]} value={{}} onChange={vi.fn()} onClose={vi.fn()} />, { auth: false })
    expect(screen.getByRole('dialog', { name: 'Фильтры' })).toHaveClass('ui-drawer', 'ui-drawer--filters')
  })

  it('campaigns FilterDrawer is narrow too', () => {
    renderWithProviders(<FilterDrawer title="Фильтры игр" sections={[]} value={{}} empty={{}} onApply={vi.fn()} onClose={vi.fn()} />, { auth: false })
    expect(screen.getByRole('dialog', { name: 'Фильтры игр' })).toHaveClass('ui-drawer--filters')
  })
})
