import { useState } from 'react'
import { label } from '@/lib/i18n/index.js'
import { Badge, ErrorBox, Skeleton } from '@/components/ui'
import { GroupRow, SectionTitle } from './editorShared.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'
import ItemsGrantModal from './ItemsGrantModal.jsx'
import ItemChoiceGroupModal from './ItemChoiceGroupModal.jsx'

const pluralOption = (n) => {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'вариант'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 'варианта'
  return 'вариантов'
}

function ItemCard({ item, itemId, quantity, onInfo }) {
  return (
    <div className="card-item relative">
      {quantity > 1 && (
        <span className="absolute right-2 top-2 rounded border border-stone-700 bg-stone-800/70 px-1.5 py-0.5 text-[11px] tabular-nums text-stone-300">
          × {quantity}
        </span>
      )}
      <button
        type="button"
        onClick={onInfo}
        className="link-ember max-w-[calc(100%-3rem)] truncate pr-2 text-left font-display text-base font-bold"
        title="Показать предмет"
      >
        {item?.name ?? `Предмет #${itemId}`}
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
}

export default function ItemsEditorBlock({
  block,
  items,
  loading,
  error,
  onRetry,
  onSaveItems,
  choiceGroups,
  choiceGroupsLoading,
  choiceGroupsError,
  onChoiceGroupsRetry,
  onSaveChoiceGroup,
  onRemoveChoiceGroup,
}) {
  const [infoItemId, setInfoItemId] = useState(null)
  const [grantOpen, setGrantOpen] = useState(false)
  const [groupModal, setGroupModal] = useState(null) // { index: number|null } | null
  const [openKeys, setOpenKeys] = useState(() => new Set())

  const toggleOpen = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const saveGrant = async (rows) => {
    await onSaveItems(rows)
    setGrantOpen(false)
  }

  const saveGroup = async (group) => {
    await onSaveChoiceGroup(group, groupModal.index)
    setGroupModal(null)
  }

  return (
    <div className="mt-6 space-y-5">
      <div>
        <SectionTitle
          button={
            <button
              type="button"
              onClick={() => setGrantOpen(true)}
              className="my-[5px] rounded border border-stone-700 px-2 py-0.5 text-[11px] text-stone-300 transition hover:bg-stone-800"
            >
              {block.addLabel}
            </button>
          }
        >
          {block.label}
        </SectionTitle>
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
            {items.map((it) => (
              <ItemCard
                key={it.item_id}
                item={it.item}
                itemId={it.item_id}
                quantity={it.quantity}
                onInfo={() => setInfoItemId(it.item_id)}
              />
            ))}
          </div>
        )}
      </div>

      {choiceGroups && (
        <div>
          <SectionTitle
            button={
              <button
                type="button"
                onClick={() => setGroupModal({ index: null })}
                className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800"
              >
                + Добавить группу
              </button>
            }
          >
            Снаряжение на выбор
          </SectionTitle>
          {choiceGroupsError && <ErrorBox error={choiceGroupsError} onRetry={onChoiceGroupsRetry} />}
          {choiceGroupsLoading ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : choiceGroups.length === 0 ? (
            <p className="text-sm text-stone-500">Групп нет — снаряжение выдаётся целиком, без выбора</p>
          ) : (
            <div className="space-y-2">
              {choiceGroups.map((g, gi) => {
                const options = g.options ?? []
                const key = `choice:${g.id ?? gi}`
                return (
                  <GroupRow
                    key={key}
                    title={`Группа ${gi + 1} · выбрать ${g.pick_count ?? 1} из ${options.length} ${pluralOption(options.length)}`}
                    open={openKeys.has(key)}
                    onToggle={() => toggleOpen(key)}
                    onEdit={() => setGroupModal({ index: gi })}
                    onRemove={() => onRemoveChoiceGroup(gi)}
                  >
                    {options.length === 0 ? (
                      <p className="text-stone-500">Вариантов нет</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {options.map((o) => (
                          <ItemCard
                            key={o.id ?? o.item_id}
                            item={o.item}
                            itemId={o.item_id}
                            quantity={o.quantity}
                            onInfo={() => setInfoItemId(o.item_id)}
                          />
                        ))}
                      </div>
                    )}
                  </GroupRow>
                )
              })}
            </div>
          )}
        </div>
      )}

      {grantOpen && (
        <ItemsGrantModal
          title={block.label}
          value={items}
          onSave={saveGrant}
          onClose={() => setGrantOpen(false)}
        />
      )}
      {groupModal && (
        <ItemChoiceGroupModal
          initialGroup={groupModal.index != null ? choiceGroups[groupModal.index] : null}
          onSave={saveGroup}
          onClose={() => setGroupModal(null)}
        />
      )}

      {infoItemId != null && (
        <ItemInfoModal itemId={infoItemId} onClose={() => setInfoItemId(null)} />
      )}
    </div>
  )
}
