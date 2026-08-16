import { useState } from 'react'
import { ruLevel } from '@/lib/i18n/index.js'
import { Badge, Button, ConfirmDialog, ErrorBox } from '@/components/ui'
import { SectionTitle } from './editorShared.jsx'

export default function FeaturesEditorBlock({ block, items, loading, error, onAdd, onEdit, onRemove, onRetry }) {
  const [confirmTarget, setConfirmTarget] = useState(null)
  return (
    <div className="mt-6 space-y-4 border-t border-stone-700/70 pt-4">
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
        <p className="text-sm text-stone-500">Загружаем умения...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">{block.empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((f, i) => (
            <div key={f.id ?? i} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-stone-100">{f.name || 'Без названия'}</p>
                    {f.level != null && <Badge tone="accent">{ruLevel(f.level)}</Badge>}
                  </div>
                  {f.description && (
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-stone-400">{f.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(i)}
                    className="mt-[5px] cursor-pointer rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
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
            </div>
          ))}
        </div>
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
