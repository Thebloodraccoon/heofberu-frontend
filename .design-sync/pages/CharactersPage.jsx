// Design-sync reference wrapper around the real character-list page
// (src/features/characters/pages/CharactersPage.jsx). The real page fetches
// via useMyCharacters/useRaces/useClasses/useBackgrounds — this wrapper
// pre-seeds those exact React Query cache keys with mock data instead of
// hitting a live backend, and supplies the Router context it needs for
// Link/useNavigate.
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import RealCharactersPage from '@/features/characters/pages/CharactersPage.jsx'

const RACES = [{ id: 1, name: 'Дворф' }, { id: 2, name: 'Эльф' }, { id: 3, name: 'Человек' }]
const CLASSES = [
  { id: 1, name: 'Воин', subclasses: [{ id: 11, name: 'Мистический рыцарь' }] },
  { id: 2, name: 'Волшебник', subclasses: [{ id: 21, name: 'Преображение' }] },
  { id: 3, name: 'Плут', subclasses: [] },
]
const BACKGROUNDS = [{ id: 1, name: 'Солдат' }, { id: 2, name: 'Отшельник' }, { id: 3, name: 'Мудрец' }]

const CHARACTERS = [
  { id: 1, name: 'Тордек Крепкорукий', level: 5, class_id: 1, subclass_id: 11, race_id: 1, background_id: 1, current_hp: 32, max_hp: 47, temp_hp: 5 },
  { id: 2, name: 'Элара Светлолистая', level: 3, class_id: 2, subclass_id: 21, race_id: 2, background_id: 3, current_hp: 18, max_hp: 18, temp_hp: 0 },
  { id: 3, name: 'Мила Скороход', level: 7, class_id: 3, subclass_id: null, race_id: 3, background_id: 2, current_hp: 40, max_hp: 52, temp_hp: 0 },
  { id: 4, name: 'Гром Однорукий', level: 1, class_id: 1, subclass_id: null, race_id: 1, background_id: 1, current_hp: 12, max_hp: 12, temp_hp: 0 },
]

function seedQueryClient(qc) {
  qc.setQueryData(queryKeys.characters.mine, CHARACTERS)
  qc.setQueryData(queryKeys.catalog.races({ size: 100 }), RACES)
  qc.setQueryData(queryKeys.catalog.classes({ size: 100 }), CLASSES)
  qc.setQueryData(queryKeys.catalog.backgrounds({ size: 100 }), BACKGROUNDS)
}

/** Character list — the landing page after login. Grid of character cards with delete confirmation. */
export function CharactersPage() {
  const [queryClient] = useState(() => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: false } } })
    seedQueryClient(qc)
    return qc
  })
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RealCharactersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}
