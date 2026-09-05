import { StatTable } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 280 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <StatTable
      rows={[
        ['Сила', 16],
        ['Ловкость', 12],
        ['Телосложение', 14],
        ['Класс доспеха', 17],
      ]}
    />
  </Shell>
)
