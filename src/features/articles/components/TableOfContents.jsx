import { useEffect, useState } from 'react'
import { smoothScrollTo } from '@/lib/utils/scroll.js'

// Оглавление статьи/руководства (.lore-toc) с подсветкой текущего раздела —
// тот же приём, что у Docusaurus: активен последний заголовок, чей верх уже
// поднялся до линии отступа под шапкой, а у конца страницы — последний.
// Линия = scroll-margin-top заголовка (шапка + 10px, см. lore.css), поэтому
// после перехода по ссылке подсвечивается именно тот раздел, к которому прокрутили.
function useActiveHeading(ids) {
  const [active, setActive] = useState(null)
  const key = ids.join(' ')

  useEffect(() => {
    const els = key.split(' ').map((id) => document.getElementById(id)).filter(Boolean)
    if (els.length === 0) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const line = (parseFloat(getComputedStyle(els[0]).scrollMarginTop) || 0) + 1
      const root = document.documentElement
      const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2
      const passed = atBottom ? els : els.filter((el) => el.getBoundingClientRect().top <= line)
      setActive(passed.at(-1)?.id ?? null)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [key])

  return active
}

// items: [{ id, title, nested? }] — id уже стоит на заголовке в тексте.
export default function TableOfContents({ items, summary, label }) {
  const active = useActiveHeading(items.map((item) => item.id))

  // Плавно, с отступом из scroll-margin-top (один источник с якорями по URL);
  // hash обновляем без нового шага истории (history.state хранит ключ React Router).
  const goTo = (e, id) => {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    smoothScrollTo(el, { offset: parseFloat(getComputedStyle(el).scrollMarginTop) || 0 })
    window.history.replaceState(window.history.state, '', `#${id}`)
  }

  return (
    <aside className="lore-toc">
      <details open>
        <summary>{summary}</summary>
        <nav aria-label={label}>
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => goTo(e, item.id)}
              aria-current={active === item.id ? 'location' : undefined}
              className={item.nested ? 'lore-toc-nested' : undefined}
            >
              {item.title}
            </a>
          ))}
        </nav>
      </details>
    </aside>
  )
}
