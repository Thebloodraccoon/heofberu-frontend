// Design-sync reference composition — the catalog's own dialogs: the browse
// filter picker, an item's full detail popup, the GM editor's feature editor,
// and the GM editor's item picker (with nested search/filter/pagination).
// Real components, mock data, a QueryClient seeded where a dialog reads one.
// See .design-sync/NOTES.md.
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FilterModal from '@/features/catalog/components/browse/FilterModal.jsx'
import ItemInfoModal from '@/features/catalog/components/browse/detail/ItemInfoModal.jsx'
import FeatureModal from '@/features/catalog/components/editor/FeaturesModal.jsx'
import ItemPickerModal from '@/features/catalog/components/editor/ItemPickerModal.jsx'
import { ITEM_FILTERS } from '@/features/catalog/components/editor/itemFilters.js'

const ITEM_DETAIL = {
  id: 3,
  name: 'Амулет здоровья +1',
  description: 'Тускло светится в темноте тёплым золотым светом. Пока вы носите этот амулет, ваш максимум хитов увеличивается на 1.',
  item_type: 'WONDROUS',
  rarity: 'UNCOMMON',
  requires_attunement: true,
  weight: 0.5,
  cost_gold: 500,
  features: [
    { id: 801, name: 'Прирост хитов', description: 'Максимум хитов увеличивается на 1, пока амулет надет.', level: null },
  ],
}

const ITEM_PAGE = [
  { id: 1, name: 'Кольчуга', description: 'Тяжёлый доспех из переплетённых металлических колец.', item_type: 'ARMOR', rarity: 'NONE' },
  { id: 2, name: 'Боевой топор', description: 'Простое рубящее оружие клана Крепкоруких.', item_type: 'WEAPON', rarity: 'NONE' },
  { id: 3, name: 'Амулет здоровья +1', description: 'Тускло светится в темноте тёплым золотым светом.', item_type: 'WONDROUS', rarity: 'UNCOMMON' },
  { id: 4, name: 'Зелье лечения', description: 'Восстанавливает 2к4+2 хитов при употреблении.', item_type: 'POTION', rarity: 'COMMON' },
]

const EXISTING_FEATURE = {
  id: 401,
  name: 'Боевой стиль',
  description: 'Выберите один из боевых стилей: Защита даёт +1 к КД, пока вы носите доспех.',
  level: 1,
  ability_increases: [],
}

const noop = () => {}

/**
 * Catalog dialogs: the browse `FilterModal` (multi-select pill filters),
 * `ItemInfoModal` (a full item detail popup, e.g. opened from an equipment
 * list), and the GM editor's `FeatureModal` (create/edit a feature, with an
 * ability-score-increase row builder) and `ItemPickerModal` (search/filter/
 * paginate the item catalog into a selection list, with an optional
 * "choose N of" group builder for class starting-equipment). Pass `which` to
 * pick one at a time.
 */
export function CatalogModals({ which = 'filter' }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    qc.setQueryData(['catalog', 'items', ITEM_DETAIL.id], ITEM_DETAIL)
    qc.setQueryData(['catalog', 'items', 'page', { page: 1, size: 50 }], { items: ITEM_PAGE, total: ITEM_PAGE.length })
    return qc
  })

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ background: 'var(--color-stone-950)', height: '100vh' }}>
        {which === 'filter' && <FilterModal filters={ITEM_FILTERS} value={{}} onChange={noop} onClose={noop} />}
        {which === 'itemInfo' && <ItemInfoModal itemId={ITEM_DETAIL.id} onClose={noop} />}
        {which === 'featureCreate' && (
          <FeatureModal title="Новая особенность" onSave={noop} onClose={noop} />
        )}
        {which === 'featureEdit' && (
          <FeatureModal
            title="Изменить особенность"
            value={EXISTING_FEATURE}
            showLevel
            levelHint="Особенность появится в описании класса с этого уровня."
            onSave={noop}
            onClose={noop}
          />
        )}
        {which === 'itemPicker' && (
          <ItemPickerModal title="Стартовое снаряжение" items={ITEM_PAGE} value={[]} onSave={noop} onClose={noop} />
        )}
        {which === 'itemPickerChoice' && (
          <ItemPickerModal
            title="Выбираемое снаряжение"
            items={ITEM_PAGE}
            value={[]}
            choiceGroups={[{ id: 1, pick_count: 1, options: [{ item_id: 2, quantity: 1 }] }]}
            onSave={noop}
            onClose={noop}
          />
        )}
      </div>
    </QueryClientProvider>
  )
}
