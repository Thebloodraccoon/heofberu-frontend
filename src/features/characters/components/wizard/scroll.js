export function smoothScrollTo(el, { offset = 150, duration = 650 } = {}) {
  if (!el) return
  const target = el.getBoundingClientRect().top + window.scrollY - offset
  const start = window.scrollY
  const dist = target - start
  if (Math.abs(dist) < 2) {
    window.scrollTo(0, target)
    return
  }
  const startTime = performance.now()
  function step(t) {
    if (!t) t = performance.now()
    const p = Math.min((t - startTime) / duration, 1)
    const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
    window.scrollTo(0, start + dist * eased)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
