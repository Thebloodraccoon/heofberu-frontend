import { Field, Input } from '@/components/ui'
import { Hint, Section, StepShell } from './StepShell.jsx'

export default function StepName({ stepNo, total, form, update }) {
  return (
    <StepShell
      stepNo={stepNo}
      total={total}
      title="Имя героя"
      subtitle="С чего начинается любой персонаж — введите имя"
    >
      <Section title="Имя">
        <div className="flex items-center gap-4">
          <span className="sheet-avatar shrink-0" title="Портрет персонажа">
            {(form.name || '?').slice(0, 1).toUpperCase()}
          </span>
          <Field label="Имя *" className="flex-1">
            <Input
              required
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Например, Аравель Тенелист"
              autoFocus
            />
          </Field>
        </div>
        <Hint className="mt-3">Остальное — история, заметки, деньги — можно заполнить позже на листе персонажа.</Hint>
      </Section>
    </StepShell>
  )
}
