import { abilityLabels, label, raceSizeLabels, ruLevel, skillLabels } from '@/lib/i18n/index.js'
import { Badge, Card } from '@/components/ui'
import { Section, SkillChips, formatBonus, itemName } from './detailHelpers.jsx'

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
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
              {selectedSub.description}
            </p>
          )
        : race.description && (
            <p className="whitespace-pre-wrap border-l-2 border-ember/50 pl-4 text-base leading-relaxed text-stone-200">
              {race.description}
            </p>
          )}

      {((selectedSub ? selectedSub.ability_bonuses : race.ability_bonuses) ?? []).length > 0 && (
        <p className="mt-3 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Бонусы характеристик: </span>
          <span className="font-semibold text-stone-100">
            {(selectedSub ? selectedSub.ability_bonuses : race.ability_bonuses)
              .map((b) => `${abilityLabels[b.ability] ?? b.ability} ${formatBonus(b.bonus)}`)
              .join(' ')}
          </span>
        </p>
      )}

      {race.granted_skills && race.granted_skills.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-relaxed">
          <span className="font-semibold text-stone-100">Навыки расы: </span>
          <SkillChips
            names={race.granted_skills.map((s) => {
              const n = itemName(s)
              return skillLabels[n] ?? label(n)
            })}
          />
        </p>
      )}

      <Section title="Особенности и умения">
        {features.length === 0 ? (
          <p className="text-sm text-stone-500">Особенностей не указано</p>
        ) : (
          <ul className="space-y-2">
            {features.map((feature) => (
              <li
                key={feature.id}
                className={`my-[3px] rounded-lg border p-2.5 ${
                  feature.fromSubrace
                    ? 'border-ember/60 bg-ember/5'
                    : 'border-stone-700/60 bg-stone-900/60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-semibold ${feature.fromSubrace ? 'text-ember' : 'text-stone-100'}`}>
                    {feature.name}
                  </p>
                  {feature.level != null && <Badge tone="accent" className="my-[5px]">{ruLevel(feature.level)}</Badge>}
                  {feature.fromSubrace && feature.subraceName && (
                    <Badge tone="accent" className="my-[5px]">Подраса: {feature.subraceName}</Badge>
                  )}
                </div>
                {feature.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                    {feature.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Card>
  )
}
