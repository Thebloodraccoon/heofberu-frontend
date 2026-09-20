// Плавная прокрутка контейнера к тому, чтобы `el` оказался у его верхнего края.
// Собственная анимация (rAF), а не behavior: 'smooth' — последний браузер
// может проигнорировать (reduced-motion, scroll-behavior в CSS) и прыгнуть сразу.
// Возвращает функцию отмены.
export function scrollChildToTop(box, el, duration = 500) {
  const start = box.scrollTop
  const target = start + (el.getBoundingClientRect().top - box.getBoundingClientRect().top)
  const max = box.scrollHeight - box.clientHeight
  const dist = Math.max(0, Math.min(target, max)) - start
  if (Math.abs(dist) < 1) return () => {}
  const t0 = performance.now()
  let raf
  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1)
    box.scrollTop = start + dist * (1 - Math.pow(1 - p, 3))
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
