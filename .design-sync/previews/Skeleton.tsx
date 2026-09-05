import { Skeleton } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <Skeleton className="h-4 w-48" />
  </Shell>
)

export const Block = () => (
  <Shell>
    <Skeleton className="h-24 w-full" />
  </Shell>
)
