import { abilityName } from '@/lib/utils/ability.js'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'

export default function StepFeat({ stepNo, total, form, update, lookups, derived, isGM }) {
  const feats = lookups.feats ?? []
  const search = useSearch(feats)
  const totals = derived?.totals ?? {}

  const prereqOk = (f) => {
    if (!f.prerequisite_ability || f.prerequisite_minimum_score == null) return true
    return (totals[f.prerequisite_ability] ?? 10) >= f.prerequisite_minimum_score
  }

  return (
    <StepShell
      stepNo={stepNo}
      total={total}
      title="Черта"
      subtitle="Последний штрих — выберите черту или оставьте персонажа без неё"
    >
      <Section title="Черта (необязательно)">
        {!isGM && (
          <Hint className="mb-3">
            Черту добавит ГМ после создания персонажа — выбор сохранится как пожелание.
          </Hint>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {form.feat_id && <Tag tone="good">Выбрано: {(lookups.feats ?? []).find((f) => String(f.id) === String(form.feat_id))?.name}</Tag>}
          {form.feat_id && (
            <button
              type="button"
              className="text-xs text-stone-400 underline decoration-dotted hover:text-ember"
              onClick={() => update({ feat_id: '' })}
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
          onSelect={(f) => update({ feat_id: String(f.id) === String(form.feat_id) ? '' : String(f.id) })}
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
      </Section>
    </StepShell>
  )
}
