import { describe, expect, it, vi } from 'vitest'
import { useLayoutEffect } from 'react'
import { render, screen } from '@testing-library/react'
import Drawer, { DrawerFooter } from '@/components/ui/Drawer.jsx'
import { Modal } from '@/components/ui/primitives.jsx'

describe('DrawerFooter', () => {
  it('keeps its className inside the drawer footer and never renders into the body first', () => {
    const seen = []
    // После каждого коммита: не оказались ли кнопки в прокручиваемом теле панели.
    const Probe = () => {
      useLayoutEffect(() => {
        seen.push(document.querySelector('.ui-drawer-body button') ? 'body' : 'elsewhere')
      })
      return null
    }
    render(
      <Drawer title="Панель" onClose={vi.fn()}>
        <DrawerFooter className="catalog-effect-actions"><button type="button">Готово</button></DrawerFooter>
        <Probe />
      </Drawer>,
    )
    const done = screen.getByRole('button', { name: 'Готово' })
    expect(done.parentElement).toHaveClass('catalog-effect-actions')
    expect(done.closest('footer')).toHaveClass('ui-drawer-footer')
    expect(seen).not.toContain('body')
  })

  it('outside a drawer — a plain footer; in a Modal opened from a drawer — inside the modal', () => {
    render(<DrawerFooter className="x-actions"><button type="button">Сам по себе</button></DrawerFooter>)
    expect(screen.getByRole('button', { name: 'Сам по себе' }).closest('footer')).toHaveClass('x-actions')

    render(
      <Drawer title="Панель" onClose={vi.fn()}>
        <Modal title="Окно" onClose={vi.fn()}>
          <DrawerFooter><button type="button">В окне</button></DrawerFooter>
        </Modal>
      </Drawer>,
    )
    const inModal = screen.getByRole('button', { name: 'В окне' })
    expect(inModal.closest('.ui-drawer-footer')).toBeNull()
    expect(inModal.closest('footer')).not.toBeNull()
  })
})
