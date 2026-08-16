import { Field, Input, TextArea } from '@/components/ui'
import { Panel, StepShell } from './StepShell.jsx'

export default function StepDetails({ stepNo, total, form, update }) {
  const set = (k) => (e) => update({ [k]: e.target.value })

  return (
    <StepShell stepNo={stepNo} total={total} title="Детали" subtitle="Имя и история героя">
      <Panel title="Имя">
        <Field label="Имя *">
          <Input required value={form.name} onChange={set('name')} placeholder="Например, Аравель Тенелист" />
        </Field>
        <div className="mt-3">
          <Field label="Изображение (путь или URL)">
            <Input value={form.image_path || ''} onChange={set('image_path')} placeholder="/images/hero.jpg" />
          </Field>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Личность и владения">
          <div className="space-y-3">
            <Field label="Особенности">
              <TextArea rows={2} value={form.traits || ''} onChange={set('traits')} />
            </Field>
            <Field label="Прочие владения">
              <TextArea rows={2} value={form.proficiencies || ''} onChange={set('proficiencies')} />
            </Field>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="История">
            <div className="space-y-3">
              <Field label="Предыстория (рассказ)">
                <TextArea rows={3} value={form.backstory || ''} onChange={set('backstory')} />
              </Field>
              <Field label="Заметки">
                <TextArea rows={2} value={form.notes || ''} onChange={set('notes')} />
              </Field>
            </div>
          </Panel>

          <Panel title="Деньги">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Золото">
                <Input type="number" min="0" value={form.money_gold ?? 0} onChange={set('money_gold')} />
              </Field>
              <Field label="Серебро">
                <Input type="number" min="0" value={form.money_silver ?? 0} onChange={set('money_silver')} />
              </Field>
              <Field label="Медь">
                <Input type="number" min="0" value={form.money_copper ?? 0} onChange={set('money_copper')} />
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </StepShell>
  )
}
