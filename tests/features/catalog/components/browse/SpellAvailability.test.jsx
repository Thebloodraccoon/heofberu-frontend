import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import SpellAvailability from '@/features/catalog/components/browse/SpellAvailability.jsx'

describe('SpellAvailability', () => {
  it('lists every class/subclass/race/subrace as a link to its catalog card', async () => {
    renderWithProviders(
      <SpellAvailability
        spell={{
          available_classes: [{ id: 1, name: 'следопыт' }],
          available_subclasses: [{ id: 7, name: 'странник горизонта', class_id: 3 }],
          available_races: [{ id: 4, name: 'коб' }],
          available_subraces: [{ id: 9, name: 'горный коб', race_id: 4 }],
        }}
      />,
      { auth: false },
    )
    expect(screen.getByRole('link', { name: 'Следопыт' })).toHaveAttribute('href', '/catalog/classes/1')
    expect(screen.getByRole('link', { name: 'Коб' })).toHaveAttribute('href', '/catalog/races/4')
    // Родитель подкласса/подрасы приходит в самой ссылке (class_id / race_id).
    expect(screen.getByRole('link', { name: 'Странник горизонта' })).toHaveAttribute('href', '/catalog/classes/3?sub=7')
    expect(screen.getByRole('link', { name: 'Горный коб' })).toHaveAttribute('href', '/catalog/races/4?sub=9')
  })
})
