import { abilityName } from '@/lib/utils/ability.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'

export default function StepFeat({ stepNo, total, form, update, lookups, derived }) {
  const feats = lookups.feats ?? []
  const search = useSearch(feats)
  const totals = derived?.totals ?? {}

  const prereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (totals[f.prerequisite_ability] ?? 10) >= f.prerequisite_minimum_score
  }

  const selectedFeat = feats.find((f) => String(f.id) === String(form.feat_id))
  const asiOptions = selectedFeat?.ability_score_increases ?? []

  const selectFeat = (f) => {
    const nextId = String(f.id) === String(form.feat_id) ? '' : String(f.id)
    update(nextId ? { feat_id: nextId, feat_asi_id: '' } : { feat_id: '', feat_asi_id: '' })
  }

  return (
    <StepShell
      stepNo={stepNo}
      total={total}
      title="Черта происхождения"
      subtitle="Каждый герой начинает с одной чертой — она задаёт его особый стиль"
    >
      <Section title="Черта (обязательно)">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {selectedFeat && <Tag tone="good">Выбрано: {selectedFeat.name}</Tag>}
          {selectedFeat && (
            <button
              type="button"
              className="text-xs text-stone-400 underline decoration-dotted hover:text-ember"
              onClick={() => update({ feat_id: '', feat_asi_id: '' })}
            >
              сбросить
            </button>
          )}
        </div>
        <PickerGrid
          items={search.filtered}
          query={search.query}
          onQueryChange={search.setQuery}
          searchPlaceholder="Поиск черты по названию и описанию…"
          selectedId={form.feat_id}
          isDisabled={(f) => !prereqOk(f)}
          onSelect={selectFeat}
          descriptionOf={(f) => f.description}
        >
          {(f) =>
            !prereqOk(f) ? (
              <Tag tone="bad" className="mt-1.5">
                Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score} (сейчас{' '}
                {totals[f.prerequisite_ability] ?? '—'})
              </Tag>
            ) : null
          }
        </PickerGrid>

        {asiOptions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-stone-200">Вариант улучшения характеристики</p>
            <Hint className="mb-3">Эта черта предлагает выбор — укажите, что получит персонаж.</Hint>
            <div className="grid gap-2 sm:grid-cols-2">
              {asiOptions.map((opt) => {
                const active = String(form.feat_asi_id) === String(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => update({ feat_asi_id: String(opt.id) })}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active
                        ? 'border-ember bg-ember/10 text-stone-100'
                        : 'border-stone-700/60 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {abilityName(opt.ability)} +{opt.amount}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Section>
    </StepShell>
  )
}
