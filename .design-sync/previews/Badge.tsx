import { Badge } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <Badge>Уровень 5</Badge>
  </Shell>
)

export const Tones = () => (
  <Shell>
    <Badge tone="accent">Легендарный</Badge>
    <Badge tone="good">Активно</Badge>
    <Badge tone="bad">Истощено</Badge>
  </Shell>
)
