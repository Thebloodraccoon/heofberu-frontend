import { EmptyState } from '@/components/ui'
import { OptionCard } from './OptionCard.jsx'
import { Feature, Hint, Search, Section, StepShell, Tag } from './StepShell.jsx'
import { useSearch } from './useSearch.js'

export default function StepBackground({ stepNo, total, form, update, lookups }) {
  const { backgroundDetail } = lookups
  const selectedBackground = (lookups.backgrounds ?? []).find(
    (b) => String(b.id) === String(form.background_id),
  )
  const search = useSearch(lookups.backgrounds ?? [])

  return (
    <StepShell stepNo={stepNo} total={total} title="Предыстория" subtitle="Выберите предысторию героя">
      <Section title="Предыстория">
        {(lookups.backgrounds ?? []).length === 0 && <EmptyState text="Предыстории не загружены" />}
        <Search
          className="mb-3 max-w-sm"
          placeholder="Поиск предыстории…"
          value={search.query}
          onChange={search.setQuery}
        />
        <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {search.filtered.map((b) => (
            <OptionCard
              key={b.id}
              selected={String(b.id) === String(form.background_id)}
              onClick={() => update({ background_id: String(b.id) })}
              title={b.name}
            />
          ))}
          {search.filtered.length === 0 && <Hint>Ничего не найдено.</Hint>}
        </div>
        {selectedBackground && !backgroundDetail && <Hint className="mt-3">Загружаем предысторию…</Hint>}
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
    </StepShell>
  )
}
