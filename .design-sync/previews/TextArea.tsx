import { useState } from 'react'
import { TextArea } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 360 }}>{children}</div>
)

export const Default = () => {
  const [value, setValue] = useState('Родился в горной деревне на севере, ушёл искать приключений после того как...')
  return (
    <Shell>
      <TextArea value={value} onChange={(e) => setValue(e.target.value)} rows={4} />
    </Shell>
  )
}
