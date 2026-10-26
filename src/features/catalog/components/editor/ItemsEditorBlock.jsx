import EditorAddButton from './EditorAddButton.jsx'
import { useState } from 'react'
import { describeItemFilter } from '@/lib/utils/effectBundle.js'
import { ErrorBox, Skeleton } from '@/components/ui'
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

// Снаряжение построчно: строка-панель — предмет (или фильтр «любое простое
// оружие») слева, количество справа.
function ItemsList({ rows, onInfo }) {
  return (
    <ul className="space-y-2">
      {rows.map((row, i) => (
        <li key={row.id ?? row.item_id ?? `filter-${i}`} className="flex items-center gap-3 rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 truncate">
            {row.item_id == null ? (
              <span className="text-stone-200">{describeItemFilter(row)}</span>
            ) : (
              <button type="button" onClick={() => onInfo(row.item_id)} className="link-ember text-left" title="Показать предмет">
                {row.item?.name ?? `Предмет #${row.item_id}`}
              </button>
            )}
          </span>
          <span className="shrink-0 tabular-nums text-stone-300">× {row.quantity ?? 1}</span>
        </li>
      ))}
    </ul>
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
            <EditorAddButton
              onClick={() => setGrantOpen(true)}
              aria-label="Добавить снаряжение"
            >
              Добавить
            </EditorAddButton>
          }
        >
          {block.label}
        </SectionTitle>
        {error && <ErrorBox error={error} onRetry={onRetry} />}

        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">{block.empty}</p>
        ) : (
          <ItemsList rows={items} onInfo={setInfoItemId} />
        )}
      </div>

      {choiceGroups && (
        <div>
          <SectionTitle
            button={
              <EditorAddButton
                onClick={() => setGroupModal({ index: null })}
                aria-label="Добавить группу"
              >
                Добавить
              </EditorAddButton>
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
                      <ItemsList rows={options} onInfo={setInfoItemId} />
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
        <ItemInfoModal drawer itemId={infoItemId} onClose={() => setInfoItemId(null)} />
      )}
    </div>
  )
}
