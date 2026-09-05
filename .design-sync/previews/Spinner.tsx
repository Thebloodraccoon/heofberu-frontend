import { Spinner } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <Spinner />
  </Shell>
)

export const CustomLabel = () => (
  <Shell>
    <Spinner label="Сохраняем изменения..." />
  </Shell>
)
