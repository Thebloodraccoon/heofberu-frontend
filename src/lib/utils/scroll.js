// Прокрутка контейнера к `el` с небольшим отступом от верхнего края.
// Собственная анимация (rAF), а не behavior: 'smooth' — последний браузер
// может проигнорировать (reduced-motion, scroll-behavior в CSS) и прыгнуть сразу.
// Для элементов у конца списка прокручиваем без анимации.
// Возвращает функцию отмены.
export function scrollChildToTop(box, el, duration = 650) {
  const destination = () => {
    const target = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8
    return Math.max(0, Math.min(target, box.scrollHeight - box.clientHeight))
  }
  const elementRect = el.getBoundingClientRect()
  const spaceAfterElement = box.scrollHeight - (box.scrollTop + elementRect.bottom - box.getBoundingClientRect().top)
  if (duration <= 0 || spaceAfterElement <= box.clientHeight / 2) {
    box.scrollTop = destination()
    return () => {}
  }
  const t0 = performance.now()
  let raf
  let previousEased = 0
  const step = (now) => {
    const p = Math.min((now - t0) / duration, 1)
    const eased = (1 - Math.cos(Math.PI * p)) / 2
    const portion = (eased - previousEased) / (1 - previousEased)
    box.scrollTop += (destination() - box.scrollTop) * portion
    previousEased = eased
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}
