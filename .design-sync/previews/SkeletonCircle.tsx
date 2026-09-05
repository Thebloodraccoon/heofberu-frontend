import { SkeletonCircle } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', gap: 16, alignItems: 'center' }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <SkeletonCircle />
  </Shell>
)

export const Large = () => (
  <Shell>
    <SkeletonCircle size="size-16" />
  </Shell>
)
