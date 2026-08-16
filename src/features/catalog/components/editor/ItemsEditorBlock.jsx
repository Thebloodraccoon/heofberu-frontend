import { useState } from 'react'
import { label } from '@/lib/i18n/index.js'
import { Button, ConfirmDialog, ErrorBox } from '@/components/ui'
import { SectionTitle } from './editorShared.jsx'

export default function ItemsEditorBlock({ block, items, loading, error, onAdd, onRemove, onRetry }) {
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
        <p className="text-sm text-stone-500">Загружаем снаряжение...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-stone-500">{block.empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.item_id}
              className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-100">
                    {it.item?.name ?? `Предмет #${it.item_id}`}
                  </p>
                  {it.item?.item_type && (
                    <p className="mt-0.5 text-xs text-stone-400">{label(it.item.item_type)}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm text-stone-300">× {it.quantity}</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="xs"
                    className="my-[5px]"
                    onClick={() => setConfirmTarget(it)}
                  >
                    Убрать
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmTarget && (
        <ConfirmDialog
          title="Убрать предмет?"
          message={
            <>
              Вы точно хотите убрать{' '}
              <span className="font-semibold text-stone-100">
                «{confirmTarget.item?.name ?? `Предмет #${confirmTarget.item_id}`}»
              </span>{' '}
              из стартового снаряжения? Это действие необратимо.
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
