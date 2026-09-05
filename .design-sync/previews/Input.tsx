import { useState } from 'react'
import { Input } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 280 }}>{children}</div>
)

export const Default = () => {
  const [value, setValue] = useState('Тордек')
  return (
    <Shell>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Имя персонажа" />
    </Shell>
  )
}

export const Disabled = () => (
  <Shell>
    <Input value="Недоступно для правки" disabled onChange={() => {}} />
  </Shell>
)
