import { FactList, FactRow } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 320 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <FactList>
      <FactRow label="Раса" value="Дворф-горец" />
      <FactRow label="Класс" value="Воин, 5 уровень" />
      <FactRow label="Мировоззрение" value="Законно-добрый" />
    </FactList>
  </Shell>
)
