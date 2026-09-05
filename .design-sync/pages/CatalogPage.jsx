// Design-sync reference wrapper around the real catalog browse/detail page
// (src/features/catalog/pages/CatalogPage.jsx, exports `CatalogListPage`).
// Seeds all 8 catalog resources (races, classes, skills, spells,
// backgrounds, feats, items, features) — each renders through its OWN real
// DetailPanel sub-component (RaceDetailCard/ClassDetailCard/SpellDetailCard/
// BackgroundDetailCard/FeatureDetailCard/ItemDetailCard/FeatDetailCard, or
// GenericDetail for skills) via src/features/catalog/components/browse/
// detail/DetailPanel.jsx's `resource` dispatch — see .design-sync/NOTES.md
// for why these differ enough to need per-resource mocks. Provides a routed
// path so useParams()/useSearchParams() resolve.
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PAGE_SIZE } from '@/features/catalog/catalog.js'
import { CatalogListPage } from '@/features/catalog/pages/CatalogPage.jsx'

const RACE_LIST = [
  { id: 1, name: 'Человек', description: 'Универсальный и амбициозный народ, преобладающий почти везде.', size: 'MEDIUM' },
  { id: 2, name: 'Дворф', description: 'Крепкий подземный народ, славящийся стойкостью и мастерством кузнецов.', size: 'MEDIUM' },
  { id: 3, name: 'Эльф', description: 'Изящный народ волшебного происхождения, живущий на грани смертного мира.', size: 'MEDIUM' },
  { id: 4, name: 'Полурослик', description: 'Небольшой, удачливый и на удивление отважный народ.', size: 'SMALL' },
]
const RACE_DETAIL = {
  id: 2,
  name: 'Дворф',
  description: 'Крепкий подземный народ, славящийся стойкостью и мастерством кузнецов. Дворфы живут в горных крепостях и редко доверяют магии.',
  size: 'MEDIUM',
  speed: 25,
  ability_bonuses: [{ ability: 'CON', bonus: 2 }],
  granted_skills: [{ id: 6, name: 'История' }],
  features: [
    { id: 1, name: 'Стойкость дворфов', description: 'Преимущество на спасброски против яда, и сопротивление к урону ядом.', level: null },
    { id: 2, name: 'Боевое обучение дворфов', description: 'Владение боевым топором, ручным топором, лёгким и боевым молотом.', level: null },
  ],
  subraces: [
    {
      id: 21,
      name: 'Дворф-горец',
      description: 'Крепкие и выносливые, горные дворфы — искусные воины.',
      ability_bonuses: [{ ability: 'STR', bonus: 2 }],
      features: [{ id: 21, name: 'Владение доспехами дворфов', description: 'Владение лёгкими и средними доспехами.', level: null, fromSubrace: true }],
    },
    {
      id: 22,
      name: 'Дворф-щитовик',
      description: 'Известны стойкостью в бою и верностью своему клану.',
      ability_bonuses: [{ ability: 'WIS', bonus: 1 }],
      features: [{ id: 22, name: 'Дворфская стойкость', description: 'Раз в день можете снизить получаемый урон на бросок хитов + Телосложение.', level: null, fromSubrace: true }],
    },
  ],
}

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

const SKILL_LIST = [
  { id: 1, name: 'Атлетика', ability: 'STR' },
  { id: 4, name: 'Скрытность', ability: 'DEX' },
  { id: 13, name: 'Восприятие', ability: 'WIS' },
  { id: 18, name: 'Убеждение', ability: 'CHA' },
]
const SKILL_DETAIL = { id: 13, name: 'Восприятие', ability: 'WIS', description: 'Ваша Мудрость (Восприятие) отражает вашу способность замечать людей, предметы или обстоятельства с помощью зрения, слуха или обоняния.' }

const SPELL_LIST = [
  { id: 1, name: 'Огненный снаряд', level: 'CANTRIP', school: 'EVOCATION', description: 'Швыряете в цель огненный шар, наносящий урон огнём.' },
  { id: 2, name: 'Щит', level: 'LEVEL_1', school: 'ABJURATION', description: 'Невидимый барьер даёт +5 к КД до начала следующего хода.' },
  { id: 3, name: 'Огненный шар', level: 'LEVEL_3', school: 'EVOCATION', description: 'Яркая вспышка вырывается из точки в пределах дистанции.' },
]
const SPELL_DETAIL = {
  id: 3,
  name: 'Огненный шар',
  level: 'LEVEL_3',
  school: 'EVOCATION',
  cast_time: 'ACTION',
  range_value: 150,
  duration: 'INSTANTANEOUS',
  is_concentration: false,
  is_ritual: false,
  components: ['VERBAL', 'SOMATIC', 'MATERIAL'],
  material: 'крошечный шарик из гуано летучей мыши и серы',
  damage_dice_count: 8,
  damage_dice_type: 'D6',
  damage_type: 'FIRE',
  description: 'Яркая вспышка вырывается из точки в пределах дистанции, и каждое существо в сфере радиусом 20 футов с центром в этой точке должно совершить спасбросок Ловкости.',
  higher_levels: 'При накладывании на слоте 4 уровня и выше урон увеличивается на 1к6 за каждый уровень выше третьего.',
  source: 'Книга игрока',
  available_classes: [{ name: 'Волшебник' }, { name: 'Чародей' }],
}

const BACKGROUND_LIST = [
  { id: 5, name: 'Солдат', description: 'Прошли выучку в армии, познав дисциплину и цену войны.' },
  { id: 6, name: 'Отшельник', description: 'Годы, проведённые в уединении, дали время для размышлений.' },
]
const BACKGROUND_DETAIL = {
  id: 5,
  name: 'Солдат',
  description: 'Вы служили в армии — регулярной, ополчении, или наёмником. Военная жизнь научила вас дисциплине и цене крови.',
  granted_skills: [{ id: 1, name: 'Атлетика' }, { id: 16, name: 'Запугивание' }],
  personality_traits_suggestions: 'Я прямолинеен в бою, как и в жизни.\nЯ никогда не откажусь помочь тому, с кем сражался бок о бок.',
  ideals_suggestions: 'Долг. Я выполняю то, что должен, ради своей роты и командира.',
  bonds_suggestions: 'Однажды я вернусь и отвоюю землю, потерянную моей семьёй.',
  flaws_suggestions: 'Мне слишком легко даётся насилие в напряжённых ситуациях.',
  features: [
    { id: 601, name: 'Военное звание', description: 'Солдаты признают ваш авторитет и статус, оказывая уважение при необходимости.', level: null },
  ],
  starting_items: [
    { quantity: 1, item_id: 30, item: { name: 'Знак отличия воинского подразделения' } },
    { quantity: 1, item_id: 31, item: { name: 'Набор игральных костей' } },
  ],
}

const FEAT_LIST = [
  { id: 10, name: 'Тяжеловес', description: 'Один раз в свой ход, промахнувшись рукопашной атакой, вы можете перебросить кубик атаки.' },
  { id: 11, name: 'Атлет', description: 'Вы натренировали своё тело для физических подвигов.', ability_score_increases: [{ ability: 'STR', amount: 1 }] },
]
const FEAT_DETAIL = {
  id: 11,
  name: 'Атлет',
  description: 'Вы натренировали своё тело для физических подвигов. Увеличьте Силу или Ловкость на 1, до максимума 20.',
  prerequisite_ability: null,
  prerequisite_minimum_score: null,
  prerequisite_description: null,
  ability_score_increases: [{ ability: 'STR', amount: 1 }],
  features: [
    { id: 701, name: 'Прыжки', description: 'Вставание с положения лёжа стоит вам только 1.5 метра движения.', level: null },
  ],
}

const ITEM_LIST = [
  { id: 1, name: 'Кольчуга', description: 'Тяжёлый доспех из переплетённых металлических колец.', rarity: 'NONE', item_type: 'ARMOR' },
  { id: 4, name: 'Зелье лечения', description: 'Восстанавливает 2к4+2 хитов при употреблении.', rarity: 'COMMON', item_type: 'POTION' },
  { id: 3, name: 'Амулет здоровья +1', description: 'Тускло светится в темноте тёплым золотым светом.', rarity: 'UNCOMMON', item_type: 'WONDROUS', requires_attunement: true },
]
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

const FEATURE_LIST = [
  { id: 100, name: 'Дар предков', description: 'Раз в день можете перебросить один провальный спасбросок.', level: null },
  { id: 101, name: 'Благословение странника', description: 'Скорость увеличивается на 3 метра, пока вы не носите тяжёлый доспех.', level: null },
]
const FEATURE_DETAIL = {
  id: 100,
  name: 'Дар предков',
  description: 'Раз в день можете перебросить один провальный спасбросок и должны использовать новый результат.',
  level: null,
  ability_increases: [],
}

function seedQueryClient(qc) {
  const seedResource = (name, list, detail, listParams = {}) => {
    qc.setQueryData(['catalog', name, 'page', { page: 1, size: PAGE_SIZE, ...listParams }], { items: list, total: list.length })
    qc.setQueryData(['catalog', name, detail.id], detail)
  }
  seedResource('races', RACE_LIST, RACE_DETAIL)
  seedResource('classes', CLASS_LIST, CLASS_DETAIL)
  seedResource('skills', SKILL_LIST, SKILL_DETAIL)
  seedResource('spells', SPELL_LIST, SPELL_DETAIL)
  seedResource('backgrounds', BACKGROUND_LIST, BACKGROUND_DETAIL)
  seedResource('feats', FEAT_LIST, FEAT_DETAIL)
  seedResource('items', ITEM_LIST, ITEM_DETAIL)
  seedResource('features', FEATURE_LIST, FEATURE_DETAIL, { source_type: 'OTHER' })
}

/**
 * Catalog browse/detail page — all 8 resources (races, classes, skills,
 * spells, backgrounds, feats, items, features) are seeded, each rendering
 * through its own real DetailPanel sub-component. Pass `path` to pick a
 * resource/browse or resource/id/detail view, e.g. `/catalog/spells` (grid)
 * or `/catalog/races/2?sub=21` (detail with a subrace selected).
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
