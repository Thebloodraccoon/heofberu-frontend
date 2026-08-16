import { OptionCard } from './OptionCard.jsx'
import { Hint, Section, StepShell } from './StepShell.jsx'

const asNum = (v) => Number(v) || 0

export default function StepLevel({ stepNo, total, form, update, derived }) {
  const { dieSides, conMod, hpLevel1, avgGain } = derived
  const level = asNum(form.level)

  const setLevel = (raw) => {
    const v = Math.min(20, Math.max(1, asNum(raw)))
    update({ level: String(v) })
  }

  const setHpMode = (mode) => update({ hp_mode: mode })

  return (
    <StepShell stepNo={stepNo} total={total} title="Уровень и ХП" subtitle="Выберите уровень и способ подсчёта хитов">
      <Section title="Уровень">
        <div className="flex items-center gap-5">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-stone-900/60 font-display text-3xl font-bold text-gold-light">
            {level}
          </span>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min="1"
              max="20"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full accent-ember"
            />
            <div className="mt-1 flex justify-between text-xs text-stone-500">
              <span>1</span>
              <span>10</span>
              <span>20</span>
            </div>
          </div>
        </div>
        {level >= 4 && (
          <Hint className="mt-3">
            На уровнях {[4, 8, 12, 16, 19].filter((l) => l <= level).join(', ')} потребуется выбрать улучшение
            характеристик или черту.
          </Hint>
        )}
      </Section>

      <Section title={`Хиты за уровни 2–${level > 1 ? level : ''}`}>
        <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px] text-stone-300">
          <span>Уровень 1: к{dieSides} + {conMod} = <b className="text-stone-100">{hpLevel1}</b> HP</span>
          <span className="text-stone-400">Среднее за уровень: {avgGain} HP</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <OptionCard
            selected={form.hp_mode === 'average'}
            onClick={() => setHpMode('average')}
            title="Среднее"
            subtitle={`+${avgGain} HP за каждый уровень`}
          />
          <OptionCard
            selected={form.hp_mode === 'roll'}
            onClick={() => setHpMode('roll')}
            title="Броски кубика"
            subtitle={`к${dieSides} + мод. за каждый уровень`}
          />
        </div>
        {form.hp_mode === 'roll' && (
          <Hint className="mt-3">Кости будут брошены на шаге «Сводка» — там же можно перебросить.</Hint>
        )}
      </Section>
    </StepShell>
  )
}
