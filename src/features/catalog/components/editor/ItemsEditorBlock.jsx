import { useState } from 'react'
import { label } from '@/lib/i18n/index.js'
import { Badge, ErrorBox, Skeleton } from '@/components/ui'
import { SectionTitle } from './editorShared.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'

export default function ItemsEditorBlock({
  block,
  items,
  loading,
  error,
  onAdd,
  onRetry,
  choiceGroups,
  choiceGroupsLoading,
  choiceGroupsError,
  onChoiceGroupsRetry,
}) {
  const [infoItemId, setInfoItemId] = useState(null)
  return (
    <div className="mt-6 space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <SectionTitle>{block.label}</SectionTitle>
          <button
            type="button"
            onClick={onAdd}
            className="my-[5px] rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
          >
            {block.addLabel}
          </button>
        </div>
        {error && <ErrorBox error={error} onRetry={onRetry} />}
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="card-item space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">{block.empty}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => {
              const item = it.item
              return (
                <div key={it.item_id} className="card-item relative">
                  <span className="absolute right-2 top-2 rounded border border-stone-700 bg-stone-800/70 px-1.5 py-0.5 text-[11px] tabular-nums text-stone-300">
                    × {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInfoItemId(it.item_id)}
                    className="link-ember max-w-[calc(100%-3rem)] truncate pr-2 text-left font-display text-sm font-bold"
                    title="Показать предмет"
                  >
                    {item?.name ?? `Предмет #${it.item_id}`}
                  </button>
                  <div className="badge-row mt-1.5">
                    {item?.item_type && <Badge className="my-[5px]">{label(item.item_type)}</Badge>}
                    {item?.rarity && item.rarity !== 'NONE' && (
                      <Badge
                        tone={item.rarity === 'LEGENDARY' || item.rarity === 'ARTIFACT' ? 'accent' : 'default'}
                        className="my-[5px]"
                      >
                        {label(item.rarity)}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {infoItemId != null && (
        <ItemInfoModal itemId={infoItemId} onClose={() => setInfoItemId(null)} />
      )}
    </div>
  )
}
