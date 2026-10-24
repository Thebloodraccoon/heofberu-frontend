import { useCallback, useState } from 'react'
import { NavigationGuard } from './UnsavedGuard.jsx'
import UnsavedGuardContext from './UnsavedGuardContext.js'

// У нескольких внутренних вкладок один блокировщик перехода. Их формы могут
// оставаться смонтированными и хранить черновики независимо друг от друга.
export default function UnsavedGuardProvider({ children }) {
  const [guards, setGuards] = useState({})
  const register = useCallback((id, guard) => setGuards((current) => {
    if (!guard?.when && !current[id]) return current
    const next = { ...current }
    if (guard?.when) next[id] = guard
    else delete next[id]
    return next
  }), [])
  const active = Object.values(guards)
  return <UnsavedGuardContext.Provider value={register}>
    <NavigationGuard when={active.length > 0} ignoreNavigation={(current, next) => active.every((guard) => guard.ignoreNavigation?.(current, next))} />
    {children}
  </UnsavedGuardContext.Provider>
}
