import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const drawerStack = []

export default function Drawer({ title, subtitle, onClose, children, footer, bodyClassName = '', closeLabel = 'Закрыть фильтры' }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const token = Symbol()
    drawerStack.push(token)
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    const root = document.getElementById('root')
    const wasInert = root?.inert
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (drawerStack.at(-1) !== token) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key !== 'Tab') return
      const controls = panelRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      drawerStack.splice(drawerStack.indexOf(token), 1)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (root) root.inert = wasInert
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return createPortal(
    <div className="ui-drawer-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={panelRef} className="ui-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="ui-drawer-header">
          <div>
            <h2 id={titleId} className="heading-section">{title}</h2>
            {subtitle && <p className="subtitle mt-1">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" className="ui-drawer-close" aria-label={closeLabel} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className={`ui-drawer-body ${bodyClassName}`}>{children}</div>
        {footer && <footer className="ui-drawer-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  )
}
