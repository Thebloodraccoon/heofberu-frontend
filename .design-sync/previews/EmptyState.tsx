import { EmptyState } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 360 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <EmptyState text="Пока нет ни одного персонажа" />
  </Shell>
)
