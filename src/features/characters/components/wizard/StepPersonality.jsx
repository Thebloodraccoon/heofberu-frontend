import { Field, Input } from '@/components/ui'
import { OptionCard } from './OptionCard.jsx'
import { Hint, Search, Section, StepShell, Tag } from './StepShell.jsx'
import { useSearch } from './useSearch.js'
import { abilityName } from '@/lib/utils/ability.js'

export default function StepPersonality({ stepNo, total, form, update, lookups }) {
  const set = (k) => (e) => update({ [k]: e.target.value })
  const feats = lookups.feats ?? []
  const search = useSearch(feats)

  const selectFeat = (id) => update({ feat_id: String(id) === String(form.feat_id) ? '' : String(id) })

  return (
    <StepShell stepNo={stepNo} total={total} title="Личность" subtitle="Черта и имя героя">
      <Section title="Черта (необязательно)">
        <Search
          className="mb-3 max-w-sm"
          placeholder="Поиск черты…"
          value={search.query}
          onChange={search.setQuery}
        />
        {feats.length === 0 && <Hint>Черты ещё не загружены.</Hint>}
        <div className="grid gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {search.filtered.map((f) => {
            const needs = f.prerequisite_ability && f.prerequisite_minimum_score != null
            const selected = String(f.id) === String(form.feat_id)
            return (
              <OptionCard
                key={f.id}
                selected={selected}
                onClick={() => selectFeat(f.id)}
                title={f.name}
              >
                {needs && (
                  <Tag tone="dim" className="mt-1.5">
                    Нужно: {abilityName(f.prerequisite_ability)} ≥ {f.prerequisite_minimum_score}
                  </Tag>
                )}
              </OptionCard>
            )
          })}
          {search.filtered.length === 0 && <Hint>Ничего не найдено.</Hint>}
        </div>
        {form.feat_id && (
          <Hint className="mt-3">Выбранная черта будет добавлена персонажу при создании.</Hint>
        )}
      </Section>

      <Section title="Имя">
        <Field label="Имя *">
          <Input required value={form.name} onChange={set('name')} placeholder="Например, Аравель Тенелист" />
        </Field>
        <Hint className="mt-2">Остальное (история, заметки, деньги) можно заполнить позже на листе персонажа.</Hint>
      </Section>
    </StepShell>
  )
}
