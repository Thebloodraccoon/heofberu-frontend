import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui'

// Защита несохранённой правки: переход внутри приложения (другая страница, другая статья ?id=,
// «Ко всем статьям», назад в браузере) спрашивает подтверждение; закрытие/перезагрузка вкладки —
// штатное предупреждение браузера (beforeunload, свой текст браузеры не показывают).
// Нужен data-router (createBrowserRouter в App.jsx).
export default function UnsavedGuard({ when }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search,
  )

  useEffect(() => {
    if (!when) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  if (blocker.state !== 'blocked') return null
  return (
    <ConfirmDialog
      title="Уйти без сохранения?"
      message="Вы не сохранили правку. Если уйти, изменения пропадут."
      cancelText="Остаться"
      confirmText="Уйти без сохранения"
      onCancel={() => blocker.reset()}
      onConfirm={() => blocker.proceed()}
    />
  )
}
