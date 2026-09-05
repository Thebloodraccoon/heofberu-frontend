import { SkeletonCard, SkeletonCircle, SkeletonText } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 320 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <SkeletonCard />
  </Shell>
)

export const WithAvatar = () => (
  <Shell>
    <SkeletonCard className="gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkeletonCircle />
        <SkeletonText w="60%" />
      </div>
    </SkeletonCard>
  </Shell>
)
