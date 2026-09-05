import { Badge, Card } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 320 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <Card>
      <h3 className="heading-card">Меч +1</h3>
      <p className="text-body mt-1">Волшебный длинный меч, светится в присутствии нежити.</p>
      <div className="mt-3">
        <Badge tone="accent">Редкий</Badge>
      </div>
    </Card>
  </Shell>
)
