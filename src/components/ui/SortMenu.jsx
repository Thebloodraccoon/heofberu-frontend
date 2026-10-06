import { useEffect, useId, useRef, useState } from 'react'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

export default function SortMenu({ options, value, onChange, label = 'Сортировка' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const id = useId()
  const selected = options.find(([key]) => key === value)?.[1] ?? options[0]?.[1]
  useEffect(() => {
    if (!open) return
    root.current.querySelector('[aria-checked="true"]')?.focus()
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div ref={root} className="sort-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={trigger} type="button" className="lore-sort-control" aria-label={label} title={`${label}: ${selected}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) }
    }}><LoreIcon name="sort" /><span>{selected}</span></button>
    {open && <div id={id} className="sort-menu-options" role="menu" aria-label={label} onKeyDown={(event) => {
      const items = [...event.currentTarget.querySelectorAll('[role="menuitemradio"]')]
      const index = items.indexOf(document.activeElement)
      const next = event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null
      if (next !== null) { event.preventDefault(); items[next].focus() }
    }}>
      {options.map(([key, name]) => <button key={key} type="button" role="menuitemradio" aria-checked={key === value} onClick={() => { onChange(key); setOpen(false); trigger.current?.focus() }}>
        <span>{name}</span>{key === value && <LoreIcon name="check" />}
      </button>)}
    </div>}
  </div>
}
