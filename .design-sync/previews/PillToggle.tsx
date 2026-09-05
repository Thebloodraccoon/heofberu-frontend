import { useState } from 'react'
import { PillToggle } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 360 }}>{children}</div>
)

const SCHOOLS = [
  { value: 'evocation', label: 'Воплощение' },
  { value: 'illusion', label: 'Иллюзия' },
  { value: 'necromancy', label: 'Некромантия' },
  { value: 'abjuration', label: 'Ограждение' },
]

export const Default = () => {
  const [selected, setSelected] = useState(['evocation'])
  const toggle = (v) => setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]))
  return (
    <Shell>
      <PillToggle options={SCHOOLS} selected={selected} onToggle={toggle} />
    </Shell>
  )
}
