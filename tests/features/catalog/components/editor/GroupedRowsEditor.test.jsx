import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import GroupedRowsEditor from '@/features/catalog/components/editor/GroupedRowsEditor.jsx'

const section = {
  key: 'suggestions',
  empty: 'Вариантов нет',
  groupKey: 'suggestion_type',
  textKey: 'text',
  groups: [{ value: 'IDEAL', label: 'Идеалы', column: 'Идеал' }, { value: 'FLAW', label: 'Слабости', column: 'Слабость' }],
}
const rows = [
  { id: 1, suggestion_type: 'IDEAL', text: 'Свобода' },
  { id: 2, suggestion_type: 'IDEAL', text: 'Честь' },
]

describe('GroupedRowsEditor', () => {
  it('shows a group as a кN table and saves an edited row with its own button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<GroupedRowsEditor section={section} rows={rows} onChange={onChange} />, { auth: false })
    expect(screen.getByRole('columnheader', { name: 'к2' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Идеал' })).toBeInTheDocument()
    expect(screen.getByText('Вариантов нет')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Изменить: Идеалы' }))
    const panel = screen.getByRole('dialog', { name: 'Идеалы' })
    expect(within(panel).queryByText('1.')).not.toBeInTheDocument()
    expect(within(panel).queryByRole('button', { name: 'Готово' })).not.toBeInTheDocument()

    await user.click(within(panel).getAllByRole('button', { name: 'Редактировать вариант' })[0])
    await user.type(within(panel).getByRole('textbox', { name: 'Идеалы: вариант' }), '!')
    await user.click(within(panel).getByRole('button', { name: 'Отмена' }))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(within(panel).getAllByRole('button', { name: 'Редактировать вариант' })[0])
    await user.type(within(panel).getByRole('textbox', { name: 'Идеалы: вариант' }), '!')
    await user.click(within(panel).getByRole('button', { name: 'Сохранить' }))
    expect(onChange).toHaveBeenCalledWith([
      // jsdom ставит каретку в начало contenteditable — проверяем, что правка дошла
      { id: 1, suggestion_type: 'IDEAL', text: expect.stringMatching(/^(?=.*!)(?=.*Свобода)/) },
      { id: 2, suggestion_type: 'IDEAL', text: 'Честь' },
    ])
    await user.click(within(panel).getByRole('button', { name: 'Закрыть' }))
    expect(screen.queryByRole('dialog', { name: 'Идеалы' })).not.toBeInTheDocument()
  })

  it('adds a row via its own save and deletes a row right away', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<GroupedRowsEditor section={section} rows={rows} onChange={onChange} />, { auth: false })
    await user.click(screen.getByRole('button', { name: 'Изменить: Идеалы' }))
    await user.click(screen.getAllByRole('button', { name: 'Удалить вариант' })[0])
    expect(onChange).toHaveBeenLastCalledWith([{ id: 1, suggestion_type: 'IDEAL', text: 'Честь' }])

    await user.click(screen.getByRole('button', { name: 'Добавить вариант' }))
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Идеалы: вариант' }), 'Мир')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 1, suggestion_type: 'IDEAL', text: 'Свобода' },
      { id: 2, suggestion_type: 'IDEAL', text: 'Честь' },
      { suggestion_type: 'IDEAL', text: expect.stringContaining('М') },
    ])
  })
})
