import { FactList, FactRow } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 320 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <FactList>
      <FactRow label="Предыстория" value="Солдат" />
    </FactList>
  </Shell>
)
