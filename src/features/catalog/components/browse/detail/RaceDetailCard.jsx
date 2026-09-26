import { abilityLabels, raceSizeLabels, sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Badge, Card, RichText } from '@/components/ui'
import { Section, FeatureCards, SkillChips, TagChips, formatBonus, itemName } from './detailHelpers.jsx'
import CatalogImage from '../CatalogImage.jsx'

function AbilityBonusChips({ bonuses = [] }) {
  return (
    <span className="badge-row align-middle">
      {bonuses.map((b, i) => (
        <span
          key={i}
          className="inline-block rounded bg-stone-800/80 px-1.5 py-0.5 text-sm text-stone-100"
        >
          {abilityLabels[b.ability] ?? b.ability} {formatBonus(b.bonus)}
        </span>
      ))}
    </span>
  )
}

export default function RaceDetailCard({ race, selectedSub, subLoading }) {
  const activeTags = (() => {
    if (!selectedSub) return race.tags ?? []
    const byId = new Map()
    for (const t of race.tags ?? []) byId.set(t.id, t)
    for (const t of selectedSub.tags ?? []) byId.set(t.id, t)
    return Array.from(byId.values())
  })()
  const raceFeatures = (race.features ?? []).map((f) => ({ ...f, fromSubrace: false }))
  const subFeatures = selectedSub
    ? (selectedSub.features ?? []).map((f) => ({
        ...f,
        fromSubrace: true,
        subraceName: selectedSub.name,
      }))
    : []
  const features = [...raceFeatures, ...subFeatures]

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="order-2 min-w-0 flex-1 sm:order-1">
          <div className="mb-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-stone-100">{sentenceCase(race.name)}</h1>
            </div>
            {selectedSub && (
              <p className="mt-1 font-display text-lg font-semibold text-ember">{sentenceCase(selectedSub.name)}</p>
            )}
            <TagChips tags={activeTags} className="mt-1.5" />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            <Badge className="my-[5px]">Размер: {raceSizeLabels[race.size] ?? race.size}</Badge>
            <Badge className="my-[5px]">Скорость: {race.speed} фт.</Badge>
          </div>

          {selectedSub
            ? selectedSub.description && <RichText value={selectedSub.description} className="description-blockquote" />
            : race.description && <RichText value={race.description} className="description-blockquote" />}

          {(race.ability_bonuses ?? []).length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
              <span className="font-semibold text-stone-100">Бонусы характеристик: </span>
              <AbilityBonusChips bonuses={race.ability_bonuses} />
            </p>
          )}
          {selectedSub && (selectedSub.ability_bonuses ?? []).length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
              <span className="font-semibold text-stone-100">Бонусы характеристик подрасы: </span>
              <AbilityBonusChips bonuses={selectedSub.ability_bonuses} />
            </p>
          )}

          {race.granted_skills && race.granted_skills.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
              <span className="font-semibold text-stone-100">Навыки расы: </span>
              <SkillChips
                names={race.granted_skills
                  .map((s) => {
                    const n = itemName(s)
                    return { id: s.id ?? s.item_id, __name: skillLabels[n] ?? sentenceCase(n) }
                  })
                  .sort((a, b) => a.__name.localeCompare(b.__name, 'ru'))}
              />
            </p>
          )}
        </div>

        <div className="order-1 w-full shrink-0 sm:order-2 sm:w-auto flex justify-center items-start">
          <CatalogImage
            imageUrl={selectedSub?.image_url ?? race.image_url}
            alt={selectedSub ? selectedSub.name : race.name}
            title={selectedSub ? selectedSub.name : race.name}
          />
        </div>
      </div>

      <Section title="Особенности и умения">
        {subLoading && (
          <p className="mb-2 text-sm text-stone-500" aria-busy="true">
            Загрузка особенностей подрасы…
          </p>
        )}
        <FeatureCards features={features} />
      </Section>
    </Card>
  )
}