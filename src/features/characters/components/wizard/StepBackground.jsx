import { EmptyState } from '@/components/ui'
import { Feature, Hint, Section, StepShell, Tag } from './StepShell.jsx'
import PickerGrid from './PickerGrid.jsx'
import { useSearch } from './useSearch.js'

export default function StepBackground({ stepNo, total, form, update, lookups }) {
  const { backgroundDetail } = lookups
  const selectedBackground = (lookups.backgrounds ?? []).find(
    (b) => String(b.id) === String(form.background_id),
  )
  const search = useSearch(lookups.backgrounds ?? [])

  return (
    <StepShell stepNo={stepNo} total={total} title="Предыстория" subtitle="Кем герой был до начала приключений (необязательно)">
      <Section>
        {(lookups.backgrounds ?? []).length === 0 && <EmptyState text="Предыстории не загружены" />}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {form.background_id && <Tag tone="good">Выбрано: {selectedBackground?.name}</Tag>}
          {form.background_id && (
            <button
              type="button"
              className="text-xs text-stone-400 underline decoration-dotted hover:text-ember"
              onClick={() => update({ background_id: '' })}
            >
              сбросить
            </button>
          )}
        </div>
        <PickerGrid
          items={search.filtered}
          query={search.query}
          onQueryChange={search.setQuery}
          searchPlaceholder="Поиск предыстории по названию и описанию…"
          selectedId={form.background_id}
          onSelect={(b) => update({ background_id: String(b.id), class_skill_ids: [] })}
        />
        {form.background_id && !backgroundDetail && <Hint className="mt-3">Загружаем предысторию…</Hint>}
        {backgroundDetail && (
          <div className="mt-4 space-y-3">
            {(backgroundDetail.granted_skills ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Tag>Навыки:</Tag>
                {(backgroundDetail.granted_skills ?? []).map((s) => (
                  <Tag key={s.id}>{s.name}</Tag>
                ))}
              </div>
            )}
            {(backgroundDetail.starting_items ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(backgroundDetail.starting_items ?? []).map((it) => (
                  <p
                    key={it.item_id}
                    className="flex items-center gap-2 rounded-lg border border-stone-800 bg-stone-900/50 px-3 py-2 text-sm text-emerald-300"
                  >
                    <span className="min-w-0 flex-1 truncate" title={it.item?.name ?? `Предмет #${it.item_id}`}>
                      {it.item?.name ?? `Предмет #${it.item_id}`}
                    </span>
                    {it.quantity > 1 && <span className="shrink-0 font-medium text-ember">×{it.quantity}</span>}
                  </p>
                ))}
              </div>
            )}
            {(backgroundDetail.features ?? []).length > 0 && (
              <div className="space-y-2">
                {(backgroundDetail.features ?? []).map((f) => (
                  <Feature key={f.id} name={f.name} description={f.description} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </StepShell>
  )
}
