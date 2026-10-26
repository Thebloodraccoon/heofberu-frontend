import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ErrorBox } from './primitives.jsx'
import { FooterSlotContext } from './drawerFooterSlot.js'

const drawerStack = []

// Кнопки вложенного экрана (не своего Drawer, а подменённого содержимого панели)
// — в подвал ближайшей панели: он закреплён внизу, прокручивается только тело.
// Вне панели — обычный <footer className={className}>. Пока подвал панели не
// смонтирован, не рисуем ничего (иначе кнопки мелькнули бы в теле).
export function DrawerFooter({ children, className = '' }) {
  const context = useContext(FooterSlotContext)
  if (!context) return <footer className={className}>{children}</footer>
  if (!context.slot) return null
  return createPortal(<div className={className || 'contents'}>{children}</div>, context.slot)
}

// Ширина у всех панелей одна (--drawer-width в components.css) — своей ширины не задаём;
// variant="filters" — панель только с фильтрами, всегда уже (--drawer-width-filters).
export default function Drawer({ title, subtitle, onClose, children, footer, confirmation, bodyClassName = '', className = '', closeLabel = 'Закрыть фильтры', variant = null }) {
  const titleId = useId()
  const confirmationId = useId()
  const confirmationRef = useRef(null)
  const lastFocusRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [footerSlot, setFooterSlot] = useState(null)
  const footerContext = useMemo(() => ({ slot: footerSlot }), [footerSlot])
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
      <section ref={panelRef} className={`ui-drawer ${variant === 'filters' ? 'ui-drawer--filters' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} inert={confirming} onFocusCapture={(event) => { lastFocusRef.current = event.target }}>
        <header className="ui-drawer-header">
          <div>
            <h2 id={titleId} className="heading-section">{title}</h2>
            {subtitle && <p className="subtitle mt-1">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" className="ui-drawer-close" aria-label={closeLabel} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className={`ui-drawer-body ${bodyClassName}`}><FooterSlotContext.Provider value={footerContext}>{children}</FooterSlotContext.Provider></div>
        {/* Подвал всегда в разметке (пустой скрыт CSS) — в него же пишет DrawerFooter. */}
        <footer ref={setFooterSlot} className="ui-drawer-footer">{footer}</footer>
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
