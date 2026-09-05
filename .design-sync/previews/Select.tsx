import { useState } from 'react'
import { Select } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 280 }}>{children}</div>
)

const CLASSES = ['Воин', 'Волшебник', 'Плут', 'Жрец']

export const Default = () => {
  const [value, setValue] = useState('Воин')
  return (
    <Shell>
      <Select value={value} onChange={(e) => setValue(e.target.value)}>
        {CLASSES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
    </Shell>
  )
}

export const Placeholder = () => (
  <Shell>
    <Select value="" onChange={() => {}} placeholder="Выберите класс">
      {CLASSES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </Select>
  </Shell>
)
