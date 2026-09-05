import { useState } from 'react'
import { Field, Input, Select } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
)

export const WithInput = () => {
  const [value, setValue] = useState('Тордек')
  return (
    <Shell>
      <Field label="Имя персонажа">
        <Input value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </Shell>
  )
}

export const WithSelect = () => {
  const [value, setValue] = useState('Воин')
  return (
    <Shell>
      <Field label="Класс">
        <Select value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="Воин">Воин</option>
          <option value="Волшебник">Волшебник</option>
        </Select>
      </Field>
    </Shell>
  )
}
