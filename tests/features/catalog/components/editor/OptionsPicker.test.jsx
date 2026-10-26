import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import OptionsPicker from '@/features/catalog/components/editor/OptionsPicker.jsx'

const options = [
  { value: 1, label: 'Бард — Коллегия Доблести', parentId: 10, parentName: 'Бард' },
  { value: 2, label: 'Бард — Коллегия Знаний', parentId: 10, parentName: 'Бард' },
  { value: 3, label: 'Воин — Чемпион', parentId: 20, parentName: 'Воин' },
]

describe('OptionsPicker drawer', () => {
  it('searches on «Найти» and filters by the parent', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <OptionsPicker drawer label="Доступно подклассам" options={options} selected={[]} onToggle={vi.fn()} parentFilterLabel="Класс" />,
      { auth: false },
    )
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    const panel = screen.getByRole('dialog', { name: 'Доступно подклассам' })

    await user.type(within(panel).getByRole('searchbox'), 'знаний')
    expect(within(panel).getByRole('button', { name: 'Воин — Чемпион' })).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Найти' }))
    expect(within(panel).queryByRole('button', { name: 'Воин — Чемпион' })).not.toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Бард — Коллегия Знаний' })).toBeInTheDocument()

    await user.clear(within(panel).getByRole('searchbox'))
    await user.click(within(panel).getByRole('button', { name: 'Найти' }))
    await user.click(within(panel).getByRole('button', { name: /Фильтры/ }))
    const filters = screen.getByRole('dialog', { name: 'Фильтры' })
    await user.click(within(filters).getByRole('button', { name: 'Воин' }))
    await user.click(within(filters).getByRole('button', { name: 'Применить' }))

    expect(within(panel).getByRole('button', { name: 'Воин — Чемпион' })).toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Бард — Коллегия Доблести' })).not.toBeInTheDocument()
  })

  it('has no «Фильтры» without a parent filter', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OptionsPicker drawer label="Доступно классам" options={options} selected={[]} onToggle={vi.fn()} />, { auth: false })
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.queryByRole('button', { name: /Фильтры/ })).not.toBeInTheDocument()
  })
})
