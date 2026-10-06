import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import SpellAvailability from '@/features/catalog/components/browse/SpellAvailability.jsx'

vi.mock('@/features/catalog/api.js', () => ({
  catalogApi: {
    classes: { subclasses: { get: vi.fn(async (_, id) => ({ id, class_id: 3 })) } },
    races: { subraces: { get: vi.fn(async (_, id) => ({ id, race_id: 4 })) } },
  },
}))

describe('SpellAvailability', () => {
  it('lists every class/subclass/race/subrace as a link to its catalog card', async () => {
    renderWithProviders(
      <SpellAvailability
        spell={{
          available_classes: [{ id: 1, name: 'следопыт' }],
          available_subclasses: [{ id: 7, name: 'странник горизонта' }],
          available_races: [{ id: 4, name: 'коб' }],
          available_subraces: [{ id: 9, name: 'горный коб' }],
        }}
      />,
      { auth: false },
    )
    expect(screen.getByRole('link', { name: 'Следопыт' })).toHaveAttribute('href', '/catalog/classes/1')
    expect(screen.getByRole('link', { name: 'Коб' })).toHaveAttribute('href', '/catalog/races/4')
    // Родитель подкласса/подрасы берётся из её детали — ссылка появляется после загрузки.
    expect(await screen.findByRole('link', { name: 'Странник горизонта' })).toHaveAttribute('href', '/catalog/classes/3?sub=7')
    expect(await screen.findByRole('link', { name: 'Горный коб' })).toHaveAttribute('href', '/catalog/races/4?sub=9')
  })
})
