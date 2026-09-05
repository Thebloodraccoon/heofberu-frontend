// Design-sync reference wrapper around the real catalog browse/detail page
// (src/features/catalog/pages/CatalogPage.jsx, exports `CatalogListPage`).
// Scoped to ONE resource ('classes') as a representative example — the real
// page supports many resources (races, spells, items, feats, backgrounds,
// features, skills) via a shared catalog.js registry, each with its own
// DetailPanel renderer; mocking every resource is out of scope here. Seeds
// the exact React Query cache keys the page and its inline detail query use,
// and provides a routed path so useParams()/useSearchParams() resolve.
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PAGE_SIZE } from '@/features/catalog/catalog.js'
import { CatalogListPage } from '@/features/catalog/pages/CatalogPage.jsx'

const CLASS_LIST = [
  { id: 1, name: 'Воин', description: 'Мастер боевых искусств, владеющий оружием и доспехами лучше любого другого класса.', hit_dice: 'D10' },
  { id: 2, name: 'Волшебник', description: 'Изучает магию через книги заклинаний и многолетние исследования.', hit_dice: 'D6' },
  { id: 3, name: 'Плут', description: 'Хитрость, скрытность и смертоносная точность.', hit_dice: 'D8' },
  { id: 4, name: 'Жрец', description: 'Проводник божественной силы своего божества.', hit_dice: 'D8' },
  { id: 5, name: 'Варвар', description: 'Свирепый воин, черпающий силу из первобытной ярости.', hit_dice: 'D12' },
  { id: 6, name: 'Бард', description: 'Вдохновляющий сказитель, чья магия черпается из искусства.', hit_dice: 'D8' },
]

const CLASS_DETAIL = {
  id: 1,
  name: 'Воин',
  description: 'Мастер боевых искусств, владеющий оружием и доспехами лучше любого другого класса.',
  hit_dice: 'D10',
  saving_throws: [{ ability: 'STR' }, { ability: 'CON' }],
  armor_proficiencies: [{ armor_type: 'LIGHT' }, { armor_type: 'MEDIUM' }, { armor_type: 'HEAVY' }, { armor_type: 'SHIELD' }],
  weapon_proficiencies: [{ weapon_category: 'SIMPLE' }, { weapon_category: 'MARTIAL' }],
  skill_choice_count: 2,
  available_skills: [
    { id: 1, name: 'Атлетика' }, { id: 16, name: 'Запугивание' }, { id: 13, name: 'Восприятие' }, { id: 6, name: 'История' },
  ],
  starting_items: [{ item_id: 20, quantity: 1, item: { name: 'Кольчуга' } }],
  starting_choice_groups: [{ pick_count: 1, options: [
    { id: 601, item_id: 21, item: { name: 'Боевой топор' } },
    { id: 602, item_id: 22, item: { name: 'Длинный меч' } },
  ] }],
  features: [
    { id: 401, name: 'Боевой стиль', description: 'Выберите один из боевых стилей: Защита даёт +1 к КД в доспехах.', level: 1 },
    { id: 402, name: 'Второе дыхание', description: 'Бонусным действием восстанавливаете 1к10 + уровень воина хитов.', level: 1 },
    { id: 403, name: 'Всплеск действий', description: 'Один раз за короткий или длинный отдых можно совершить дополнительное действие.', level: 2 },
    { id: 404, name: 'Дополнительная атака', description: 'Атакуете дважды при совершении действия Атака.', level: 5 },
  ],
  subclasses: [
    { id: 11, name: 'Мистический рыцарь', description: 'Сочетает боевое мастерство с магией волшебника.', features: [
      { id: 501, name: 'Заклинания мистического рыцаря', description: 'Изучаете заклинания волшебника, в основном школ ограждения и воплощения.', level: 3 },
    ] },
    { id: 12, name: 'Чемпион', description: 'Стремится к физическому совершенству через простую, но смертоносную мощь.', features: [
      { id: 502, name: 'Превосходный критический удар', description: 'Критическое попадание при выпадении 19 или 20 на кубике атаки.', level: 3 },
    ] },
  ],
}

function seedQueryClient(qc) {
  qc.setQueryData(['catalog', 'classes', 'page', { page: 1, size: PAGE_SIZE }], { items: CLASS_LIST, total: CLASS_LIST.length })
  qc.setQueryData(['catalog', 'classes', 1], CLASS_DETAIL)
}

/**
 * Catalog browse/detail page, scoped to the 'classes' resource as a
 * representative example (the real page supports many catalog resources).
 * Pass `path="/catalog/classes"` for the browse grid, or
 * `path="/catalog/classes/1?sub=11"` for the detail view with a subclass
 * selected.
 */
export function CatalogPage({ path = '/catalog/classes' }) {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc)
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/catalog/:resource/:id" element={<CatalogListPage />} />
          <Route path="/catalog/:resource" element={<CatalogListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
