import { abilityName, bonusMap } from '@/lib/utils/ability.js'
import { Feature, Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'

const sizeLabel = (size) =>
  size === 'TINY'
    ? 'Крошечный'
    : size === 'SMALL'
      ? 'Маленький'
      : size === 'MEDIUM'
        ? 'Средний'
        : size === 'LARGE'
          ? 'Большой'
          : size === 'HUGE'
            ? 'Огромный'
            : 'Гигантский'

export default function StepRace({ stepNo, total, form, update, lookups }) {
  const { raceDetail, raceFeatures, subraceDetail, subraceFeatures } = lookups
  const subraces = raceDetail?.subraces ?? []

  // В списке расы приходят без бонусов — подтягиваем их у выбранной расы
  // из детали, чтобы карточка показывала скорость, размер и бонусы как у подрасы.
  const races = (lookups.races ?? []).map((r) => {
    if (!raceDetail || String(r.id) !== String(form.race_id)) return r
    return {
      ...r,
      speed: raceDetail.speed ?? r.speed,
      size: raceDetail.size ?? r.size,
      ability_bonuses: raceDetail.ability_bonuses ?? r.ability_bonuses,
    }
  })

  const raceCardInfo = (r) => {
    const bonuses = Object.entries(bonusMap(r.ability_bonuses)).filter(([, v]) => v)
    if (!r.speed && !r.size && bonuses.length === 0) return null
    return (
      <span className="mt-1.5 flex flex-wrap gap-1">
        {r.speed && <Tag>Скорость: {r.speed} фт.</Tag>}
        {r.size && <Tag>{sizeLabel(r.size)}</Tag>}
        {bonuses.map(([code, v]) => (
          <Tag key={code} tone="accent">
            {abilityName(code)} +{v}
          </Tag>
        ))}
      </span>
    )
  }

  return (
    <StepShell stepNo={stepNo} total={total} title="Раса" subtitle="Выберите расу героя">
      <Section>
        <PickerGrid
          items={races}
          noSearch
          columns="sm:grid-cols-2 xl:grid-cols-3"
          selectedId={form.race_id}
          onSelect={(r) => update({ race_id: String(r.id), subrace_id: '' })}
        >
          {raceCardInfo}
        </PickerGrid>
        {raceDetail && (
          <div className="mt-4 space-y-3">
            {(raceFeatures ?? []).length > 0 && (
              <div className="space-y-2">
                {(raceFeatures ?? []).map((f) => (
                  <Feature key={f.id} name={f.name} description={f.description} />
                ))}
              </div>
            )}
          </div>
        )}
        {form.race_id && !raceDetail && <Hint className="mt-2">Загружаем расу…</Hint>}
      </Section>

      {subraces.length > 0 && (
        <Section title="Подраса (необязательно)">
          <PickerGrid
            items={[{ id: '', name: 'Без подрасы' }, ...subraces]}
            noSearch
            columns="sm:grid-cols-2 xl:grid-cols-3"
            selectedId={form.subrace_id}
            onSelect={(s) => update({ subrace_id: String(s.id) })}
          >
            {raceCardInfo}
          </PickerGrid>
          {subraceDetail && (
            <div className="mt-4 space-y-3">
              {(subraceFeatures ?? []).length > 0 && (
                <div className="space-y-2">
                  {(subraceFeatures ?? []).map((f) => (
                    <Feature key={f.id} name={f.name} description={f.description} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </StepShell>
  )
}