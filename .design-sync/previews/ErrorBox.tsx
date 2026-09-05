import { ErrorBox } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div style={{ background: 'var(--color-stone-950)', padding: 24, width: 360 }}>{children}</div>
)

export const Default = () => (
  <Shell>
    <ErrorBox error={new Error('Не удалось загрузить персонажа')} />
  </Shell>
)

export const WithRetry = () => (
  <Shell>
    <ErrorBox error={new Error('Сервер недоступен')} onRetry={() => {}} />
  </Shell>
)
