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

  const renderChoiceGroups = () => {
    if (choiceGroupsError) return <ErrorBox error={choiceGroupsError} onRetry={onChoiceGroupsRetry} />
    if (choiceGroupsLoading) {
      return (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )
    }
    if (!choiceGroups || choiceGroups.length === 0) return null

    return (
      <div className="space-y-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          Снаряжение на выбор
        </p>
        {choiceGroups.map((g) => {
          return (
            <div key={g.id ?? g.sort_order}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
                Группа {g.sort_order + 1} — количество: {g.pick_count}
              </p>
              {(g.options ?? []).length === 0 ? (
                <p className="text-sm text-stone-500">Вариантов нет</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {(g.options ?? []).map((o) => {
                    const item = o.item
                    return (
                      <div key={o.id ?? o.item_id} className="card-item relative">
                        {o.quantity > 1 && (
                          <span className="absolute right-2 top-2 rounded border border-stone-700 bg-stone-800/70 px-1.5 py-0.5 text-[11px] tabular-nums text-stone-300">
                            × {o.quantity}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setInfoItemId(o.item_id)}
                          className="link-ember max-w-[calc(100%-3rem)] truncate pr-2 text-left font-display text-base font-bold"
                          title="Показать предмет"
                        >
                          {item?.name ?? `Предмет #${o.item_id}`}
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <SectionTitle
          button={
            <button
              type="button"
              onClick={onAdd}
              className="my-[5px] rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
            >
              {block.addLabel}
            </button>
          }
        >
          {block.label}
        </SectionTitle>
        {error && <ErrorBox error={error} onRetry={onRetry} />}

        <div className="space-y-4">
          {choiceGroups && renderChoiceGroups()}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
              Обязательное снаряжение
            </p>
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
                        className="link-ember max-w-[calc(100%-3rem)] truncate pr-2 text-left font-display text-base font-bold"
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
        </div>
      </div>

      {infoItemId != null && (
        <ItemInfoModal itemId={infoItemId} onClose={() => setInfoItemId(null)} />
      )}
    </div>
  )
}
