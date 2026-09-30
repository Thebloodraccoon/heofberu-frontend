import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagInput from '@/features/articles/components/TagInput.jsx'
import Drawer from '@/components/ui/Drawer.jsx'

vi.mock('@/features/articles/queries.js', () => ({
  useTagSearch: () => ({ data: { items: [{ id: 1, name: 'История', usage_count: 2 }], total: 1 } }),
  useCreateTag: () => ({ mutateAsync: vi.fn() }),
}))

function Example() {
  const [tags, setTags] = useState([])
  const [open, setOpen] = useState(true)
  return open && <Drawer title="Параметры" onClose={() => setOpen(false)}><TagInput value={tags} onChange={setTags} /></Drawer>
}

describe('Tag drawer', () => {
  it('applies selection only after confirmation and closes only the top drawer on Escape', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Добавить теги' }))
    expect(screen.getByRole('dialog', { name: 'Теги статьи' })).toHaveClass('ui-drawer')
    await user.click(screen.getByRole('button', { name: /#История/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Теги статьи' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Параметры' })).toBeVisible()
    expect(screen.getByText('Тегов пока нет.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Добавить теги' }))
    await user.click(screen.getByRole('button', { name: /#История/ }))
    await user.click(screen.getByRole('button', { name: 'Готово' }))
    expect(screen.getByRole('button', { name: 'Удалить тег История' })).toBeVisible()
  })
})
