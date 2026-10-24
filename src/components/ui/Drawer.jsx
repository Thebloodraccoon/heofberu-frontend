import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button, ErrorBox } from './primitives.jsx'

const drawerStack = []

// width — точная ширина в px (например, вложенная панель «на 50px уже» той, что под ней).
export default function Drawer({ title, subtitle, onClose, children, footer, confirmation, bodyClassName = '', className = '', closeLabel = 'Закрыть фильтры', width = null }) {
  const titleId = useId()
  const confirmationId = useId()
  const confirmationRef = useRef(null)
  const lastFocusRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = confirmation ? confirmation.onCancel : onClose }, [onClose, confirmation])

  const confirming = Boolean(confirmation)
  useEffect(() => {
    if (!confirming) return
    const previousFocus = lastFocusRef.current ?? document.activeElement
    confirmationRef.current?.querySelector('button')?.focus()
    return () => { if (previousFocus?.isConnected) previousFocus.focus() }
  }, [confirming])

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
      if (event.defaultPrevented) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
      if (event.key !== 'Tab') return
      const scope = confirmationRef.current ?? panelRef.current
      const controls = Array.from(scope?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? []).filter((control) => !control.closest('[hidden], [inert]'))
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
    <div className="ui-drawer-overlay" onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current() }}>
      <section ref={panelRef} className={`ui-drawer ${className}`} style={width ? { width } : undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} inert={confirming} onFocusCapture={(event) => { lastFocusRef.current = event.target }}>
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
      {confirmation && <div className="ui-drawer-confirmation-overlay" onClick={(event) => { if (event.target === event.currentTarget) confirmation.onCancel() }}>
        <section ref={confirmationRef} className="ui-drawer-confirmation" role="alertdialog" aria-modal="true" aria-labelledby={confirmationId} aria-describedby={`${confirmationId}-message`}>
          <h2 id={confirmationId} className="heading-section">{confirmation.title}</h2>
          <p id={`${confirmationId}-message`} className="mt-3 text-sm text-stone-300">{confirmation.message}</p>
          {confirmation.error && <ErrorBox className="mt-4" error={confirmation.error} />}
          <div className="article-filter-actions mt-5">
            <Button variant="ghost" disabled={confirmation.busy} onClick={confirmation.onCancel}>{confirmation.cancelText ?? 'Остаться'}</Button>
            <Button variant={confirmation.variant ?? 'danger'} disabled={confirmation.busy} onClick={confirmation.onConfirm}>{confirmation.busy ? confirmation.busyText ?? 'Сохраняем…' : confirmation.confirmText}</Button>
          </div>
        </section>
      </div>}
    </div>,
    document.body,
  )
}
