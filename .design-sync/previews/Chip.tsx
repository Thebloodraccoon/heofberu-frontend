import { Chip } from 'heofberu-ui'

const Shell = ({ children }) => (
  <div className="text-sm text-stone-300" style={{ background: 'var(--color-stone-950)', padding: 24, display: 'flex', flexWrap: 'wrap', gap: 4 }}>{children}</div>
)

const TAGS = ['Огнестойкость', 'Тьмавидение', 'Скрытность']

export const Row = () => (
  <Shell>
    {TAGS.map((t) => <Chip key={t}>{t}</Chip>)}
  </Shell>
)
