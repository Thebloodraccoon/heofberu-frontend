import { ASI_LEVELS, abilityName, mod, STATS } from '@/lib/utils/ability.js'
import { Button, EmptyState } from '@/components/ui'
import { Hint, Section, StepShell, Tag } from './StepShell.jsx'

const Row = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-stone-700/30 py-2 text-[15px] last:border-0">
    <span className="text-stone-400">{label}</span>
    <span className="text-right font-medium text-stone-100">{value}</span>
  </div>
)

const ItemList = ({ label, items }) => {
  if (!items || items.length === 0) return null
  return (
    <Row
      label={label}
      value={items.map((it) => `${it.item?.name ?? `Предмет #${it.item_id}`}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`).join(', ')}
    />
  )
}

export default function StepReview({ stepNo, total, form, lookups, derived, onRollHp }) {
  const { classDetail, raceDetail, backgroundDetail } = lookups
  const { totals, bonusByCode, hpLevel1, avgGain, dieSides, conMod } = derived
  const level = Number(form.level) || 1

  const findSkill = (id) => {
    const pool = [
      ...(classDetail?.available_skills ?? []),
      ...(raceDetail?.granted_skills ?? []),
      ...(backgroundDetail?.granted_skills ?? []),
    ]
    return pool.find((s) => Number(s.id) === Number(id))?.name || `Навык #${id}`
  }

  const chosen = (form.class_skill_ids ?? []).map(Number)
  const raceGranted = raceDetail?.granted_skills ?? []
  const bgGranted = backgroundDetail?.granted_skills ?? []
  const allGranted = [...raceGranted, ...bgGranted]

  const gains = {}
  for (let l = 2; l <= level; l++) {
    if (form.hp_mode === 'roll') {
      const roll = form.rolled_dice?.[l]
      gains[l] = roll != null ? roll + conMod : null
    } else gains[l] = avgGain
  }
  const missingRolls =
    form.hp_mode === 'roll' && level > 1 && Object.values(gains).some((v) => v == null)
  const knownTotal =
    hpLevel1 + Object.values(gains).filter((v) => v != null).reduce((a, b) => a + b, 0)

  const asiLevels = ASI_LEVELS.filter((l) => l >= 2 && l <= level)
  const race = (lookups.races ?? []).find((r) => String(r.id) === String(form.race_id))
  const klass = (lookups.classes ?? []).find((c) => String(c.id) === String(form.class_id))
  const background = (lookups.backgrounds ?? []).find((b) => String(b.id) === String(form.background_id))
  const subclass = classDetail?.subclasses?.find((s) => String(s.id) === String(form.subclass_id))
  const subrace = raceDetail?.subraces?.find((s) => String(s.id) === String(form.subrace_id))
  const feat = (lookups.feats ?? []).find((f) => String(f.id) === String(form.feat_id))

  const hpModeLabel = form.hp_mode === 'roll' ? 'Броски кубика' : 'Среднее'

  return (
    <StepShell stepNo={stepNo} total={total} title="Сводка" subtitle="Проверьте выборы перед созданием героя">
      <Section title="Имя">
        <p className="font-display text-xl font-bold text-stone-100">{form.name || '—'}</p>
        {feat && <p className="mt-1 text-[15px] text-stone-300">Черта: <b className="text-stone-100">{feat.name}</b></p>}
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Section title="Происхождение">
            <Row label="Раса" value={race?.name || '—'} />
            {raceDetail?.subraces?.length > 0 && <Row label="Подраса" value={subrace?.name || 'Без подрасы'} />}
            <Row label="Предыстория" value={background?.name || '—'} />
          </Section>

          <Section title="Класс">
            <Row label="Класс" value={klass?.name || '—'} />
            <Row label="Подкласс" value={subclass?.name || 'Без подкласса'} />
            <Row label="Уровень" value={level} />
            <Row label="Кость хитов" value={`к${dieSides}`} />
            <Row label="Спасброски" value={(classDetail?.saving_throws ?? []).map((s) => abilityName(s.ability)).join(', ') || '—'} />
            <Row label="HP на уровнях 2+" value={hpModeLabel} />
          </Section>

          <Section title="Стартовое снаряжение">
            <ItemList label="Класс" items={classDetail?.starting_items ?? []} />
            <ItemList label="Предыстория" items={backgroundDetail?.starting_items ?? []} />
            {(classDetail?.starting_items ?? []).length === 0 && (backgroundDetail?.starting_items ?? []).length === 0 && (
              <Hint>Стартовых предметов нет.</Hint>
            )}
          </Section>

          <Section title="Хиты">
            <Row label="Уровень 1" value={hpLevel1} />
            {level > 1 &&
              Array.from({ length: level - 1 }, (_, i) => i + 2).map((l) => (
                <Row key={l} label={`Уровень ${l}`} value={gains[l] == null ? '?' : `+${gains[l]}`} />
              ))}
            {missingRolls && (
              <div className="pt-2">
                <Hint>Кости для уровней ещё не брошены.</Hint>
                <Button className="mt-2" onClick={onRollHp}>
                  Бросить кости
                </Button>
              </div>
            )}
            {!missingRolls && level > 1 && <Row label="Итоговое HP" value={knownTotal} />}
          </Section>
        </div>

        <div className="space-y-8">
          <Section title="Характеристики">
            <div className="grid grid-cols-3 gap-2">
              {STATS.map((s) => {
                const total = totals[s.code]
                return (
                  <div key={s.key} className="rounded border border-stone-700/50 bg-stone-800/40 p-2 text-center">
                    <p className="text-xs font-medium uppercase text-stone-400">{s.short}</p>
                    <p className="text-lg font-bold text-stone-100">
                      {total}
                      {bonusByCode[s.code] ? <span className="text-xs font-normal text-emerald-300">+{bonusByCode[s.code]}</span> : null}
                    </p>
                    <p className="text-sm text-stone-300">{mod(total) > 0 ? '+' : ''}{mod(total)}</p>
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Навыки и владения">
            {chosen.length === 0 && allGranted.length === 0 && <EmptyState text="Навыки не выбраны" />}
            {chosen.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {chosen.map((id) => (
                  <Tag key={id}>
                    {findSkill(id)}
                  </Tag>
                ))}
              </div>
            )}
            {allGranted.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allGranted.map((s) => (
                  <Tag key={s.id} tone="dim">
                    {s.name} · {raceGranted.includes(s) ? 'раса' : 'предыстория'}
                  </Tag>
                ))}
              </div>
            )}
          </Section>

          <Section title="Улучшения характеристик">
            {asiLevels.length === 0 ? (
              <Hint>На уровне {level} улучшения не требуются.</Hint>
            ) : (
              <Hint>
                После создания потребуется выбрать улучшение характеристик или черту на уровнях:{' '}
                {asiLevels.join(', ')}.
              </Hint>
            )}
          </Section>
        </div>
      </div>
    </StepShell>
  )
}
