import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ErrorBox, Skeleton, SkeletonCard } from '@/components/ui'
import { EditableBlock } from '@/components/sheet/primitives.jsx'
import AbilitiesPanel from '@/features/characters/components/sheet/AbilitiesPanel.jsx'
import AbilityScores from '@/features/characters/components/sheet/AbilityScores.jsx'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'
import SheetHeader from '@/features/characters/components/sheet/SheetHeader.jsx'
import { useSkills } from '@/features/catalog/queries.js'
import { sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { STATS, mod } from '@/lib/utils/ability.js'
import { usePublicCharacterNames } from '@/features/campaigns/characterNames.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCharacterCard } from '@/features/campaigns/queries.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

const byCode = (scores) => scores && Object.fromEntries(STATS.map((stat) => [stat.code, scores[stat.key]]))
const signed = (value) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : '—')

// Назад туда, откуда пришли (витрина кампании, профиль…); если лист открыли по прямой ссылке — на доску приключений.
function BackButton() {
  const navigate = useNavigate()
  const location = useLocation()
  return <button type="button" className="public-character-back" onClick={() => (location.key === 'default' ? navigate('/public-campaigns') : navigate(-1))}><LoreIcon name="back" />Назад</button>
}

// Базовые значения таблицей: база, бонусы (раса, черты, улучшения) и итог по каждой характеристике.
function BaseScores({ bases, totals }) {
  return (
    <div className="public-character-bases">
      <table>
        <thead><tr><td />{STATS.map((stat) => <th key={stat.code} scope="col" title={stat.label}>{stat.short}</th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">База</th>{STATS.map((stat) => <td key={stat.code}>{bases[stat.code]}</td>)}</tr>
          <tr><th scope="row">Бонусы</th>{STATS.map((stat) => <td key={stat.code}>{signed(totals[stat.code] - bases[stat.code])}</td>)}</tr>
          <tr><th scope="row">Итог</th>{STATS.map((stat) => <td key={stat.code}><strong>{totals[stat.code]}</strong></td>)}</tr>
        </tbody>
      </table>
    </div>
  )
}

// Публичный лист героя — урезанная версия нашего листа персонажа, только чтение и всё сразу, без вкладок:
// как в листе: слева таблица «база — бонусы — итог», под ней спасброски и навыки с владениями (бонус мастерства
// уже учтён в цифрах), справа сверху характеристики, ниже личность и предыстория.
// Хитов, КД, доспехов, оружия, снаряжения и заклинаний в публичной карточке нет.
// Персонаж либо открыт целиком, либо для посторонних не существует (404).
export default function PublicCharacterPage() {
  const { id } = useParams()
  const { data: card, isLoading, error, refetch } = useCharacterCard(id)
  const names = usePublicCharacterNames(card)
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const skills = useMemo(() => [...skillsCatalog].sort((a, b) => (skillLabels[a.name] ?? sentenceCase(a.name)).localeCompare(skillLabels[b.name] ?? sentenceCase(b.name), 'ru')), [skillsCatalog])

  if (error) return <div className="lore-page"><ErrorBox error={error.status === 404 ? Object.assign(new Error('Владелец не показывает этого персонажа публично.'), { status: 404 }) : toCampaignError(error)} onRetry={refetch} /></div>
  if (isLoading || !card) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-64" /><SkeletonCard className="min-h-[16rem]" /></div>

  const pb = 2 + Math.floor((card.level - 1) / 4)
  const totals = byCode(card.ability_scores)
  const bases = byCode(card.base_ability_scores)
  const saveSet = new Set(card.saving_throw_proficiencies ?? [])
  const profSet = new Set((card.skill_proficiencies ?? []).map((item) => Number(item.skill_id)))
  const expertiseSet = new Set((card.skill_proficiencies ?? []).filter((item) => item.is_expertise).map((item) => Number(item.skill_id)))
  const modFor = (code) => mod(totals?.[code] ?? 10)
  const fields = [
    { label: 'Имя', value: card.name },
    { label: 'Уровень', value: String(card.level) },
    { label: 'Класс', value: names.className },
    { label: 'Подкласс', value: names.subclassName },
    { label: 'Раса', value: names.raceName },
    { label: 'Подраса', value: names.subraceName },
    { label: 'Предыстория', value: names.backgroundName },
  ]

  return (
    <div className="character-sheet public-character-sheet">
      <SheetHeader readOnly character={card} fields={fields} back={<BackButton />} />
      <div className="public-character-body">
        <aside aria-label="Спасброски и навыки">
          <AbilitiesPanel
            topStats={totals && bases && <BaseScores bases={bases} totals={totals} />}
            skills={skills}
            saveBonus={(code) => modFor(code) + (saveSet.has(code) ? pb : 0)} saveSet={saveSet}
            skillBonus={(skill) => modFor(skill.ability) + (profSet.has(Number(skill.id)) ? pb : 0) + (expertiseSet.has(Number(skill.id)) ? pb : 0)}
            profSet={profSet} expertiseSet={expertiseSet}
          />
        </aside>
        <section className="space-y-4" aria-label="Характеристики и личность">
          {totals && <AbilityScores totals={totals} />}
          <PersonalityPanel character={card} />
          <EditableBlock title="Предыстория" value={card.backstory ?? ''} />
        </section>
      </div>
    </div>
  )
}
