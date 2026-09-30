import { useId, useLayoutEffect, useRef } from 'react'

export default function EditorTabs({ tabs, value, onChange, label }) {
  const rootRef = useRef(null)
  const id = useId()
  useLayoutEffect(() => {
    const root = rootRef.current
    const update = () => {
      const selected = root.querySelector('[aria-selected="true"]')
      root.style.setProperty('--tab-left', `${selected.offsetLeft}px`)
      root.style.setProperty('--tab-width', `${selected.offsetWidth}px`)
    }
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(root)
    root.querySelectorAll('button').forEach((button) => observer.observe(button))
    return () => observer.disconnect()
  }, [value])
  return <div ref={rootRef} className="article-editor-tabs" role="tablist" aria-label={label}>
    {tabs.map(([key, name], index) => <button key={key} id={`${id}-${key}`} type="button" role="tab" aria-selected={value === key} tabIndex={value === key ? 0 : -1} onClick={() => onChange(key)} onKeyDown={(event) => {
      let next
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = tabs.length - 1
      if (next === undefined) return
      event.preventDefault()
      onChange(tabs[next][0])
      rootRef.current.querySelectorAll('button')[next].focus()
    }}>{name}</button>)}
    <span className="article-editor-tab-indicator" aria-hidden="true" />
  </div>
}
