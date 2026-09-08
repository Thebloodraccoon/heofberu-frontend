import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
})

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn()

// jsdom не реализует эти DOM-геометрические API — нужны ProseMirror-редактору
// (RichTextEditor) для определения позиции клика/курсора внутри contenteditable.
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 })
}
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} })
}
