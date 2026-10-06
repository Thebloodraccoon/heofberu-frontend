import { afterEach, describe, expect, it, vi } from 'vitest'
import { scrollChildToTop } from '@/lib/utils/scroll.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('scrollChildToTop', () => {
  it('follows a selected element while cards above it collapse', () => {
    const frames = []
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(performance, 'now').mockReturnValue(0)

    const box = {
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 200,
      getBoundingClientRect: () => ({ top: 0 }),
    }
    let elementTop = 500
    const element = {
      getBoundingClientRect: () => ({ top: elementTop - box.scrollTop, bottom: elementTop + 50 - box.scrollTop }),
    }

    scrollChildToTop(box, element)
    frames.shift()(100)
    elementTop = 300
    box.scrollHeight = 800
    frames.shift()(300)
    frames.shift()(650)

    expect(box.scrollTop).toBeCloseTo(292)
    expect(element.getBoundingClientRect().top).toBeCloseTo(8)
  })
})
