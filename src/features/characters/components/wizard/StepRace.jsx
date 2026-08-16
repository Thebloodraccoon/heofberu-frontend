import { abilityName, bonusMap } from '@/lib/utils/ability.js'
import { OptionCard } from './OptionCard.jsx'
import { Feature, Hint, Search, Section, StepShell, Tag } from './StepShell.jsx'
import { useSearch } from './useSearch.js'

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

  const raceSearch = useSearch(lookups.races ?? [])

  const raceBonuses = bonusMap(raceDetail?.ability_bonuses)
  const subraceBonuses = bonusMap(subraceDetail?.ability_bonuses)

  const renderBonuses = (list) => {
    const entries = Object.entries(list).filter(([, v]) => v)
    if (entries.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([code, v]) => (
          <Tag key={code} tone="accent">
            {abilityName(code)} +{v}
          </Tag>
        ))}
      </div>
    )
  }

  return (
    <StepShell stepNo={stepNo} total={total} title="Раса" subtitle="Выберите расу героя">
      <Section title="Раса">
        <Search
          className="mb-3 max-w-sm"
          placeholder="Поиск расы…"
          value={raceSearch.query}
          onChange={raceSearch.setQuery}
        />
        <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {raceSearch.filtered.map((r) => (
            <OptionCard
              key={r.id}
              selected={String(r.id) === String(form.race_id)}
              onClick={() => update({ race_id: String(r.id), subrace_id: '' })}
              title={r.name}
            />
          ))}
          {raceSearch.filtered.length === 0 && <Hint>Ничего не найдено.</Hint>}
        </div>
        {raceDetail && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {raceDetail.speed && <Tag>Скорость: {raceDetail.speed} фт.</Tag>}
              {raceDetail.size && <Tag>{sizeLabel(raceDetail.size)}</Tag>}
              {renderBonuses({ ...raceBonuses, ...subraceBonuses })}
            </div>
            {raceDetail.description && <p className="text-sm leading-relaxed text-stone-300">{raceDetail.description}</p>}
            {(raceFeatures ?? []).length > 0 && (
              <div className="space-y-2">
                {(raceFeatures ?? []).map((f) => (
                  <Feature key={f.id} name={f.name} description={f.description} />
                ))}
              </div>
            )}
          </div>
        )}
        {form.race_id && !raceDetail && <Hint className="mt-3">Загружаем расу…</Hint>}
      </Section>

      {subraces.length > 0 && (
        <Section title="Подраса (необязательно)">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <OptionCard
              selected={!form.subrace_id}
              onClick={() => update({ subrace_id: '' })}
              title="Без подрасы"
              subtitle="Основная раса"
            />
            {subraces.map((s) => (
              <OptionCard
                key={s.id}
                selected={String(s.id) === String(form.subrace_id)}
                onClick={() => update({ subrace_id: String(s.id) })}
                title={s.name}
              />
            ))}
          </div>
          {subraceDetail && (
            <div className="mt-4 space-y-3">
              {renderBonuses(subraceBonuses)}
              {subraceDetail.description && <p className="text-sm leading-relaxed text-stone-300">{subraceDetail.description}</p>}
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
