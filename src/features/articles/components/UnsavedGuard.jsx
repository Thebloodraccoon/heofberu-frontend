import { useContext, useEffect, useId } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui'
import UnsavedGuardContext from './UnsavedGuardContext.js'

// Защита несохранённой правки: переход внутри приложения (другая страница, другая статья ?id=,
// «Ко всем статьям», назад в браузере) спрашивает подтверждение; закрытие/перезагрузка вкладки —
// штатное предупреждение браузера (beforeunload, свой текст браузеры не показывают).
// Нужен data-router (createBrowserRouter в App.jsx).
export function NavigationGuard({ when, ignoreNavigation }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search
      && !ignoreNavigation?.(currentLocation, nextLocation),
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

function RegisteredGuard({ register, when, ignoreNavigation }) {
  const id = useId()
  useEffect(() => { register(id, { when, ignoreNavigation }) }, [id, register, when, ignoreNavigation])
  useEffect(() => () => register(id, null), [id, register])
  return null
}

export default function UnsavedGuard(props) {
  const register = useContext(UnsavedGuardContext)
  return register ? <RegisteredGuard register={register} {...props} /> : <NavigationGuard {...props} />
}
