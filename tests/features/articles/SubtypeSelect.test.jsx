import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubtypeSelect from '@/features/articles/components/SubtypeSelect.jsx'

const createSubtype = vi.hoisted(() => vi.fn())
const rename = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ isFounder: false }))

vi.mock('@/features/articles/queries.js', () => ({
  useArticleSubtypes: () => ({ data: [{ id: 1, article_type: 'location', name: 'Таверна' }, { id: 2, article_type: 'location', name: 'Город' }] }),
  useCreateSubtype: () => ({ mutateAsync: createSubtype, reset: vi.fn(), isPending: false, error: null }),
  useRenameSubtype: () => ({ mutate: rename, reset: vi.fn(), isPending: false, error: null }),
  useDeleteSubtype: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => auth }))

function setup(value = null) {
  const onChange = vi.fn()
  render(<SubtypeSelect articleType="location" value={value} onChange={onChange} />)
  return { user: userEvent.setup(), onChange }
}

describe('SubtypeSelect', () => {
  it('renames a subtype from the dictionary; only the founder may delete', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Выбрать подтип' }))
    await user.click(screen.getByRole('button', { name: 'Править словарь' }))
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Название подтипа Город' })
    await user.clear(input)
    await user.type(input, 'Столица')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(rename).toHaveBeenCalledWith({ id: 2, name: 'Столица' })
  })

  it('treats a deleted subtype as no subtype', () => {
    setup(42)
    expect(screen.getByText('Без подтипа.')).toBeVisible()
  })

  it('shows the current subtype as a removable chip', async () => {
    const { user, onChange } = setup(1)
    await user.click(screen.getByRole('button', { name: 'Убрать подтип Таверна' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('searches subtypes and picks one', async () => {
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Выбрать подтип' }))
    await user.type(screen.getByRole('textbox', { name: 'Поиск подтипов' }), 'гор')
    expect(screen.queryByRole('button', { name: 'Таверна' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Город' }))
    expect(onChange).toHaveBeenCalledWith(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a missing subtype of the current type and selects it', async () => {
    createSubtype.mockResolvedValue({ id: 3, article_type: 'location', name: 'Данж' })
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Выбрать подтип' }))
    await user.type(screen.getByRole('textbox', { name: 'Поиск подтипов' }), 'Данж')
    await user.click(screen.getByRole('button', { name: '+ Создать подтип «Данж»' }))
    expect(createSubtype).toHaveBeenCalledWith({ articleType: 'location', name: 'Данж' })
    expect(onChange).toHaveBeenCalledWith(3)
  })
})
