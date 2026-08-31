import { abilityLabels, raceSizeLabels, sentenceCase, skillLabels } from '@/lib/i18n/index.js'
import { Badge, Card } from '@/components/ui'
import { Section, FeatureCards, SkillChips, formatBonus, itemName } from './detailHelpers.jsx'

export default function RaceDetailCard({ race, selectedSub }) {
  const raceFeatures = (race.features ?? []).map((f) => ({ ...f, fromSubrace: false }))
  const subFeatures = selectedSub
    ? (selectedSub.features ?? []).map((f) => ({
        ...f,
        fromSubrace: true,
        subraceName: selectedSub.name,
      }))
    : []
  const features = [...raceFeatures, ...subFeatures]

  const fmtBonuses = (list) =>
    (list ?? [])
      .map((b) => `${abilityLabels[b.ability] ?? b.ability} ${formatBonus(b.bonus)}`)
      .join(' ')

  return (
    <Card className="my-[3px] detail-padded">
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-stone-100">{race.name}</h1>
        </div>
        {selectedSub && (
          <p className="mt-1 font-display text-lg font-semibold text-ember">{selectedSub.name}</p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge className="my-[5px]">Размер: {raceSizeLabels[race.size] ?? race.size}</Badge>
        <Badge className="my-[5px]">Скорость: {race.speed} фт.</Badge>
      </div>

      {selectedSub
        ? selectedSub.description && (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-sm leading-relaxed text-stone-200">
              {selectedSub.description}
            </p>
          )
        : race.description && (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-sm leading-relaxed text-stone-200">
              {race.description}
            </p>
          )}

      {(race.ability_bonuses ?? []).length > 0 && (
        <p className="mt-3 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Бонусы характеристик: </span>
          <span className="font-semibold text-stone-100">
            {fmtBonuses(race.ability_bonuses)}
          </span>
        </p>
      )}
      {selectedSub && (selectedSub.ability_bonuses ?? []).length > 0 && (
        <p className="mt-1 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Бонусы характеристик подрасы: </span>
          <span className="font-semibold text-stone-100">
            {fmtBonuses(selectedSub.ability_bonuses)}
          </span>
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

      <Section title="Особенности и умения">
        <FeatureCards features={features} />
      </Section>
    </Card>
  )
}