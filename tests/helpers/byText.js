// RTL's getByText/findByText matches only the direct text-node children of an
// element, so text split across inline tags (`base → <b>total</b>`) never
// matches a plain string/regex. byText(str) compares the element's full,
// whitespace-collapsed textContent instead, picking the innermost element that
// carries that text (skips ancestors whose text is only inherited from children).
export const byText = (str) => (_, el) => {
  if (!el) return false
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text !== str) return false
  if (!el.childNodes || el.childNodes.length === 0) return true
  return Array.from(el.childNodes).some(
    (n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '',
  )
}
