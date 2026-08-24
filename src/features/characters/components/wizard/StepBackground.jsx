import { Field } from '@/components/ui'
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
    <StepShell stepNo={stepNo} total={total} title="Предыстория" subtitle="Кем герой был до начала приключений">
      <Section title="Предыстория (необязательно)">
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
            {backgroundDetail.description && <p className="text-sm leading-relaxed text-stone-300">{backgroundDetail.description}</p>}
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
              <div className="space-y-2">
                {(backgroundDetail.features ?? []).map((f) => (
                  <Feature key={f.id} name={f.name} description={f.description} />
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="История героя (необязательно)">
        <Field label="Предыстория персонажа">
          <textarea
            rows={4}
            value={form.backstory}
            onChange={(e) => update({ backstory: e.target.value })}
            placeholder="Откуда родом, зачем отправился в путь…"
            className="input-base"
          />
        </Field>
      </Section>
    </StepShell>
  )
}
