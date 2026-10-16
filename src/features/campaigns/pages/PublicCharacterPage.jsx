import { useParams } from 'react-router-dom'
import { ErrorBox, FactList, FactRow, RichText, Skeleton, SkeletonCard } from '@/components/ui'
import { abilityLabels, characterVisibilityLabels, sentenceCase } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useCharacterCard } from '@/features/campaigns/queries.js'

const ABILITIES = [['strength', 'STR'], ['dexterity', 'DEX'], ['constitution', 'CON'], ['intelligence', 'INT'], ['wisdom', 'WIS'], ['charisma', 'CHA']]
const PERSONALITY = [['personality_traits', 'Черты характера'], ['ideals', 'Идеалы'], ['bonds', 'Привязанности'], ['flaws', 'Слабости']]

// Публичная карточка героя: «концепт» — кто он, «полностью» — ещё характер, предыстория, характеристики,
// снаряжение и заклинания. Скрытый персонаж для посторонних не существует (404).
export default function PublicCharacterPage() {
  const { id } = useParams()
  const { data: card, isLoading, error, refetch } = useCharacterCard(id)

  if (error) return <div className="lore-page"><ErrorBox error={error.status === 404 ? Object.assign(new Error('Владелец не показывает этого персонажа публично.'), { status: 404 }) : toCampaignError(error)} onRetry={refetch} /></div>
  if (isLoading || !card) return <div className="lore-page" aria-busy="true"><Skeleton className="mb-6 h-10 w-64" /><SkeletonCard className="min-h-[16rem]" /></div>

  const full = card.public_visibility === 'full'
  const identity = [sentenceCase(card.class_name), card.subclass_name && sentenceCase(card.subclass_name), card.race_name && sentenceCase(card.race_name), card.subrace_name && sentenceCase(card.subrace_name)].filter(Boolean).join(' · ')

  return (
    <div className="lore-page public-character-page">
      <header className="lore-header article-workspace-header"><div><p className="lore-eyebrow">Герой · {characterVisibilityLabels[card.public_visibility].toLowerCase()}</p><h1 className="heading-section">{card.name}</h1><p className="lore-intro">{card.level} уровень · {identity} · игрок {card.owner_username}</p></div></header>
      {!full && <p className="lore-preview-notice">Владелец показывает только концепт персонажа.</p>}
      {full && <div className="public-character-layout">
        {card.ability_scores && <section className="preset-section" aria-label="Характеристики"><h2 className="heading-card">Характеристики</h2><dl className="public-character-abilities">{ABILITIES.map(([key, code]) => <div key={key}><dt>{abilityLabels[code]}</dt><dd className="font-display">{card.ability_scores[key]}</dd></div>)}</dl></section>}
        {PERSONALITY.some(([key]) => card[key]) && <section className="preset-section" aria-label="Характер"><h2 className="heading-card">Характер</h2><FactList>{PERSONALITY.filter(([key]) => card[key]).map(([key, label]) => <FactRow key={key} label={label} value={card[key]} />)}</FactList></section>}
        {card.backstory && <section className="preset-section" aria-label="Предыстория"><h2 className="heading-card">Предыстория</h2><RichText value={card.backstory} /></section>}
        {card.items?.length > 0 && <section className="preset-section" aria-label="Снаряжение"><h2 className="heading-card">Снаряжение</h2><ul className="preset-card-tags">{card.items.map((item) => <li key={item.name} className="lore-chip">{item.name}{item.quantity > 1 && ` ×${item.quantity}`}</li>)}</ul></section>}
        {card.spells?.length > 0 && <section className="preset-section" aria-label="Заклинания"><h2 className="heading-card">Заклинания</h2><ul className="preset-card-tags">{card.spells.map((spell) => <li key={spell} className="lore-chip">{spell}</li>)}</ul></section>}
      </div>}
    </div>
  )
}
