import { SkeletonRows } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 320 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <SkeletonRows />
  </Shell>
)

export const FiveRows = () => (
  <Shell>
    <SkeletonRows count={5} />
  </Shell>
)
