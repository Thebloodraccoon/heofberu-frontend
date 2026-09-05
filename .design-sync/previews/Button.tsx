import { Button } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
)

export const Primary = () => (
  <Shell>
    <Button>Создать персонажа</Button>
  </Shell>
)

export const Ghost = () => (
  <Shell>
    <Button variant="ghost">Отмена</Button>
  </Shell>
)

export const Danger = () => (
  <Shell>
    <Button variant="danger" size="sm">Удалить</Button>
  </Shell>
)

export const Disabled = () => (
  <Shell>
    <Button disabled>Сохраняем...</Button>
  </Shell>
)
