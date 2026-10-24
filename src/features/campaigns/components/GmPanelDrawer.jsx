import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Skeleton } from '@/components/ui'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import GmCharacterPanel from '@/features/characters/components/sheet/GmCharacterPanel.jsx'
import { useCharacter } from '@/features/characters/queries.js'
import { toCampaignError } from '@/features/campaigns/errors.js'

// Быстрая правка персонажа ГМ стола (HP, уровень, черты, предметы…) — прямо из состава кампании.
// Отдельной страницы «Персонажи игроков» нет: лист ведёт ГМ той кампании, где персонаж в игре.
export default function GmPanelDrawer({ characterId, name, onClose }) {
  const { data: character, isLoading, error, refetch } = useCharacter(characterId)
  const [panelError, setPanelError] = useState(null)
  const title = `ГМ-панель: ${name}`

  return (
    <SheetDrawer title={title} subtitle={character ? `${character.level} уровень` : undefined} onClose={onClose}>
      <p className="mb-3"><Link className="link-ember inline-flex items-center gap-1 text-sm" to={`/characters/${characterId}`}>Открыть лист персонажа <LoreIcon name="arrow" /></Link></p>
      {error && <ErrorBox error={toCampaignError(error, { onlyKnown: true })} onRetry={refetch} />}
      {isLoading && <Skeleton className="h-64 w-full" />}
      {panelError && <div className="mb-3"><ErrorBox error={toCampaignError(panelError, { onlyKnown: true })} onRetry={() => setPanelError(null)} /></div>}
      {character && <GmCharacterPanel key={character.id} character={character} onError={setPanelError} reload={async () => { await refetch() }} />}
    </SheetDrawer>
  )
}
