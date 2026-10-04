import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import TableOfContents from '@/features/articles/components/TableOfContents.jsx'

const items = [
  { id: 's1', title: 'Первый' },
  { id: 's2', title: 'Второй' },
  { id: 's3', title: 'Третий' },
]

function setup(tops) {
  render(
    <>
      <TableOfContents items={items} summary="В этой статье" label="Оглавление" />
      {items.map((item, i) => {
        const ref = (el) => el && (el.getBoundingClientRect = () => ({ top: tops[i] }))
        return <h2 key={item.id} id={item.id} ref={ref}>{item.title}</h2>
      })}
    </>,
  )
}

const current = () => screen.getByRole('navigation', { name: 'Оглавление' }).querySelector('[aria-current]')?.textContent

describe('TableOfContents', () => {
  afterEach(() => {
    delete document.documentElement.scrollHeight
    vi.restoreAllMocks()
  })

  it('marks the last heading that has scrolled past the top line, and the last one at the page bottom', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 10000, configurable: true })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(); return 0 })
    setup([-300, -10, 400])
    // Сначала эффект подписывается — затем пересчитываем по событию прокрутки.
    await act(async () => fireEvent.scroll(window))
    expect(current()).toBe('Второй')

    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 0, configurable: true })
    await act(async () => fireEvent.scroll(window))
    expect(current()).toBe('Третий')
  })

  it('scrolls the window smoothly to the heading and puts its id into the hash on click', () => {
    const frames = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frames.push(cb); return 0 })
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    setup([0, 500, 1000])
    fireEvent.click(screen.getByRole('link', { name: 'Третий' }))
    // Анимация по кадрам, а не прыжок: до первого кадра окно не двигается,
    // а кадр после окончания анимации ставит заголовок ровно в цель.
    expect(scrollTo).not.toHaveBeenCalled()
    frames.shift()(performance.now() + 10000)
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1000)
    expect(window.location.hash).toBe('#s3')
  })
})
