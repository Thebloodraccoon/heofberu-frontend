import { Button, PageHeader } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 480 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <PageHeader title="Персонажи" subtitle="Все ваши искатели приключений" />
  </Shell>
)

export const WithActions = () => (
  <Shell>
    <PageHeader
      title="Тордек"
      subtitle="Дворф-воин, 5 уровень"
      actions={<Button>+ Новый персонаж</Button>}
    />
  </Shell>
)
