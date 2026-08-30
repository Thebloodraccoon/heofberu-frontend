import { useState } from 'react'
import { ruLevel } from '@/lib/i18n/index.js'
import { Badge, Button, ConfirmDialog, ErrorBox, Skeleton } from '@/components/ui'
import { SectionTitle } from './editorShared.jsx'

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <path d="M7 5l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FeaturesEditorBlock({
  block,
  items = [],
  loading,
  error,
  showLevel = false,
  onAdd,
  onEdit,
  onRemove,
  onRetry,
}) {
  const [expandedKeys, setExpandedKeys] = useState(() => new Set())
  const [confirmTarget, setConfirmTarget] = useState(null)

  const toggle = (key) =>
    setExpandedKeys((cur) => {
      const next = new Set(cur)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <SectionTitle>{block.label}</SectionTitle>
        <button
          type="button"
          onClick={onAdd}
          className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
        >
          {block.addLabel}
        </button>
      </div>
      {error && <ErrorBox error={error} onRetry={onRetry} />}
      {loading ? (
        <ul className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="space-y-2 rounded-lg border border-stone-700/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Skeleton className="size-4 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-6 w-16 shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">{block.empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f, i) => {
            const key = f.id ?? i
            const open = expandedKeys.has(key)
            return (
              <li
                key={key}
                className={`rounded-lg border p-3 transition ${
                  open
                    ? 'border-ember/60 bg-stone-900'
                    : 'border-stone-700/60 bg-stone-900/60 hover:border-ember/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left"
                    aria-expanded={open}
                  >
                    <Chevron open={open} />
                    <span className="min-w-0 break-words text-sm font-semibold text-stone-100">
                      {f.name || 'Без названия'}
                    </span>
                    {showLevel && f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(i)}
                      className="my-[5px] rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
                    >
                      Изменить
                    </button>
                    <Button
                      type="button"
                      variant="danger"
                      size="xs"
                      className="my-[5px]"
                      onClick={() => setConfirmTarget(f)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
                {open && f.description && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-300">
                    {f.description}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {confirmTarget && (
        <ConfirmDialog
          title={`Удалить ${block.noun}?`}
          message={
            <>
              Вы точно хотите удалить{' '}
              <span className="font-semibold text-stone-100">«{confirmTarget.name}»</span>? Это
              действие необратимо.
            </>
          }
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            setConfirmTarget(null)
            onRemove(confirmTarget)
          }}
        />
      )}
    </div>
  )
}
