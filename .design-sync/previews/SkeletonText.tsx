import { SkeletonText } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', flexDirection: 'column', gap: 8, width: 280 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <SkeletonText />
    <SkeletonText w="70%" />
  </Shell>
)

export const Narrow = () => (
  <Shell>
    <SkeletonText w="40%" />
  </Shell>
)
