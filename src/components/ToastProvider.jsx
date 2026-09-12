/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { StatusToasts } from '@/components/ui'

const ToastContext = createContext(null)
const NOOP = { push: () => {}, dismiss: () => {} }

// Единый стек всплывашек сохранения для всего приложения: GmEditorPage,
// SubraceEditor и сами TextField/RichTextField пушат сюда, а один контейнер
// StatusToasts на корне отрисовывает всё — чтобы стеки не громоздились
// поверх друг друга в правом нижнем углу.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((title, detail, tone) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-1), { id, title, detail, tone }])
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <StatusToasts toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToasts() {
  const ctx = useContext(ToastContext)
  return ctx ?? NOOP
}