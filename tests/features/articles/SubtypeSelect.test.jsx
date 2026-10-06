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
    await user.click(screen.getByRole('button', { name: 'Словарь' }))
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Название подтипа Город' })
    await user.clear(input)
    await user.type(input, 'Столица')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(rename).toHaveBeenCalledWith({ id: 2, name: 'Столица' })
  })

  it('treats a deleted subtype as no subtype', () => {
    setup(42)
    expect(screen.getByRole('button', { name: 'Подтип статьи' })).toHaveTextContent('Без подтипа')
  })

  it('shows one selected subtype and allows clearing it', async () => {
    const { user, onChange } = setup(1)
    expect(screen.getByRole('button', { name: 'Подтип статьи' })).toHaveTextContent('Таверна')
    await user.click(screen.getByRole('button', { name: 'Подтип статьи' }))
    await user.click(screen.getByRole('option', { name: 'Без подтипа' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('selects one subtype from the dropdown without opening the dictionary', async () => {
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Подтип статьи' }))
    await user.click(screen.getByRole('option', { name: 'Город' }))
    expect(onChange).toHaveBeenCalledWith(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a dictionary entry without changing the article subtype', async () => {
    createSubtype.mockResolvedValue({ id: 3, article_type: 'location', name: 'Данж' })
    const { user, onChange } = setup()
    await user.click(screen.getByRole('button', { name: 'Словарь' }))
    await user.type(screen.getByRole('textbox', { name: 'Поиск подтипов' }), 'Данж')
    await user.click(screen.getByRole('button', { name: '+ Создать подтип «Данж»' }))
    expect(createSubtype).toHaveBeenCalledWith({ articleType: 'location', name: 'Данж' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Словарь подтипов' })).toBeVisible()
  })
})
