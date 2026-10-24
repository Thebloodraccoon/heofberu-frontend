import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Запоминаем каждый набор результатов отдельно. Восстанавливаем при возврате
// браузером и по ссылке «Доска приключений», когда результаты уже загружены.
export default function useCampaignListScroll(ready) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const restored = useRef(null)
  const storageKey = `public-campaigns:scroll:${location.search}`
  const restore = navigationType === 'POP' || location.state?.restoreCampaignList === true

  useLayoutEffect(() => {
    if (!ready || restored.current === location.key) return
    restored.current = location.key
    let y = 0
    if (restore) {
      try {
        const saved = Number(sessionStorage.getItem(storageKey))
        if (Number.isFinite(saved) && saved > 0) y = saved
      } catch { /* Хранилище может быть недоступно в приватном режиме. */ }
    }
    window.scrollTo(0, y)
  }, [ready, location.key, restore, storageKey])

  useEffect(() => {
    if (!ready) return
    const remember = () => {
      try { sessionStorage.setItem(storageKey, String(window.scrollY)) } catch { /* Прокрутка работает и без хранилища. */ }
    }
    window.addEventListener('scroll', remember, { passive: true })
    return () => window.removeEventListener('scroll', remember)
  }, [ready, storageKey])
}
