import { abilityName, bonusMap } from '../../utils/ability.js'
import { EmptyState } from '../ui.jsx'
import { OptionCard } from './OptionCard.jsx'
import { Hint, Panel, StepShell, Tag } from './StepShell.jsx'

export default function StepOrigin({ stepNo, total, form, update, lookups }) {
  const { raceDetail, raceFeatures, backgroundDetail, subraceDetail, subraceFeatures } = lookups
  const selectedRace = (lookups.races ?? []).find((r) => String(r.id) === String(form.race_id))
  const subraces = raceDetail?.subraces ?? []
  const selectedBackground = (lookups.backgrounds ?? []).find((b) => String(b.id) === String(form.background_id))

  const raceBonuses = bonusMap(raceDetail?.ability_bonuses)
  const subraceBonuses = bonusMap(subraceDetail?.ability_bonuses)
  const bonusEntries = Object.entries({ ...raceBonuses, ...subraceBonuses }).filter(([, v]) => v)

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
    <StepShell stepNo={stepNo} total={total} title="Происхождение" subtitle="Выберите расу и предысторию героя">
      <Panel title="Раса">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {(lookups.races ?? []).map((r) => (
            <OptionCard
              key={r.id}
              selected={String(r.id) === String(form.race_id)}
              onClick={() => update({ race_id: String(r.id), subrace_id: '' })}
              title={r.name}
            />
          ))}
        </div>
        {raceDetail && (
          <div className="mt-3 space-y-2 border-t border-stone-700/60 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {raceDetail.speed && <Tag>Скорость: {raceDetail.speed} фт.</Tag>}
              {raceDetail.size && <Tag>{raceDetail.size === 'TINY' ? 'Крошечный' : raceDetail.size === 'SMALL' ? 'Маленький' : raceDetail.size === 'MEDIUM' ? 'Средний' : raceDetail.size === 'LARGE' ? 'Большой' : raceDetail.size === 'HUGE' ? 'Огромный' : 'Гигантский'}</Tag>}
            </div>
            {bonusEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {bonusEntries.map(([code, v]) => (
                  <Tag key={code} tone="accent">
                    {abilityName(code)} +{v}
                  </Tag>
                ))}
              </div>
            )}
            {raceDetail.description && <p className="text-sm text-stone-400">{raceDetail.description}</p>}
            {(raceFeatures ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(raceFeatures ?? []).map((f) => (
                  <div key={f.id} className="rounded border border-stone-700/50 bg-stone-800/40 p-2.5">
                    <p className="text-sm font-medium text-stone-100">{f.name}</p>
                    {f.description && <p className="mt-0.5 text-xs text-stone-400">{f.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      {subraces.length > 0 && (
        <Panel title="Подраса (необязательно)">
          <div className="grid gap-2.5 sm:grid-cols-2">
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
            <div className="mt-3 space-y-2 border-t border-stone-700/60 pt-3">
              {renderBonuses(subraceBonuses)}
              {subraceDetail.description && <p className="text-sm text-stone-400">{subraceDetail.description}</p>}
              {(subraceFeatures ?? []).length > 0 && (
                <div className="space-y-1.5">
                  {(subraceFeatures ?? []).map((f) => (
                    <div key={f.id} className="rounded border border-stone-700/50 bg-stone-800/40 p-2.5">
                      <p className="text-sm font-medium text-stone-100">{f.name}</p>
                      {f.description && <p className="mt-0.5 text-xs text-stone-400">{f.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      <Panel title="Предыстория">
        {(lookups.backgrounds ?? []).length === 0 && <EmptyState text="Предыстории не загружены" />}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {(lookups.backgrounds ?? []).map((b) => (
            <OptionCard
              key={b.id}
              selected={String(b.id) === String(form.background_id)}
              onClick={() => update({ background_id: String(b.id) })}
              title={b.name}
            />
          ))}
        </div>
        {selectedBackground && !backgroundDetail && <Hint>Загружаем предысторию…</Hint>}
        {backgroundDetail && (
          <div className="mt-3 space-y-2 border-t border-stone-700/60 pt-3">
            {backgroundDetail.description && <p className="text-sm text-stone-400">{backgroundDetail.description}</p>}
            {(backgroundDetail.granted_skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag>Навыки:</Tag>
                {(backgroundDetail.granted_skills ?? []).map((s) => (
                  <Tag key={s.id}>{s.name}</Tag>
                ))}
              </div>
            )}
            {(backgroundDetail.starting_items ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag>Стартовое снаряжение:</Tag>
                {(backgroundDetail.starting_items ?? []).map((it) => (
                  <Tag key={it.item_id} tone="dim">
                    {it.item?.name} {it.quantity > 1 ? `×${it.quantity}` : ''}
                  </Tag>
                ))}
              </div>
            )}
            {(backgroundDetail.features ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(backgroundDetail.features ?? []).map((f) => (
                  <div key={f.id} className="rounded border border-stone-700/50 bg-stone-800/40 p-2.5">
                    <p className="text-sm font-medium text-stone-100">{f.name}</p>
                    {f.description && <p className="mt-0.5 text-xs text-stone-400">{f.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {selectedRace && !raceDetail && <Hint>Загружаем расу…</Hint>}
      </Panel>
    </StepShell>
  )
}
