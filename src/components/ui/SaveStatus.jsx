import { useEffect, useState } from 'react'

export default function SaveStatus({ status, compact = false }) {
  const [dismissed, setDismissed] = useState(null)
  useEffect(() => {
    if (status?.state !== 'saved') return
    const timer = setTimeout(() => setDismissed(status), 2800)
    return () => clearTimeout(timer)
  }, [status])
  const state = status === dismissed ? 'idle' : status?.state ?? 'idle'
  return (
    <div className={`save-status ${compact ? 'save-status--compact' : ''}`} data-state={state} role={state === 'error' ? 'alert' : 'status'}>
      {state !== 'idle' && <>
        <svg className="save-status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={state === 'saving' ? 'M12 3a9 9 0 1 0 9 9' : state === 'saved' ? 'm5 12 4 4L19 6' : 'M12 8v5m0 4h.01M12 3 2 21h20Z'} />
        </svg>
        <span>{state === 'saving' ? 'Сохраняем…' : state === 'saved' ? 'Сохранено' : status.error?.message || 'Не удалось сохранить.'}</span>
        {state === 'error' && status.retry && <button type="button" onClick={status.retry}>Повторить</button>}
      </>}
    </div>
  )
}
