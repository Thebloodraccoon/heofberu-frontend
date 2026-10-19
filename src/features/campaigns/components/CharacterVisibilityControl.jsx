import { Link } from 'react-router-dom'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { characterVisibilityLabels } from '@/lib/i18n/index.js'
import { CHARACTER_VISIBILITIES } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useSetCharacterVisibility } from '@/features/campaigns/queries.js'

const HINTS = {
  hidden: 'Персонажа видите только вы, ГМ его кампании и основатель.',
  full: 'Все видят лист: имя, класс, раса, уровень, ваш ник, характеристики, владения навыками и спасбросками, личность и предыстория (без секретов мастера) — в карточке и на страницах публичных кампаний.',
}

// Только владелец решает, насколько персонаж публичен: ни ГМ, ни основатель этого не меняют.
export default function CharacterVisibilityControl({ character }) {
  const { push } = useToasts()
  const setVisibility = useSetCharacterVisibility()
  const current = character.public_visibility ?? 'hidden'
  const choose = (visibility) => visibility !== current && setVisibility.mutate({ id: character.id, visibility }, {
    onSuccess: () => push(`Публичность: ${characterVisibilityLabels[visibility].toLowerCase()}`, undefined, 'success'),
    onError: (e) => push('Не удалось изменить публичность', toCampaignError(e).message, 'error'),
  })

  return (
    <fieldset className="lore-filter-section character-visibility">
      <legend>Публичность</legend>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Публичность персонажа">{CHARACTER_VISIBILITIES.map((visibility) => <button key={visibility} type="button" className="lore-chip" aria-pressed={current === visibility} disabled={setVisibility.isPending} onClick={() => choose(visibility)}>{characterVisibilityLabels[visibility]}</button>)}</div>
      <p className="mt-2 text-hint">{HINTS[current]}</p>
      {current !== 'hidden' && <Link className="link-ember mt-2 inline-flex items-center gap-1 text-sm" to={`/characters/${character.id}/public`}>Публичная карточка <LoreIcon name="arrow" /></Link>}
    </fieldset>
  )
}
