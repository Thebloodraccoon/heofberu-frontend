import { Badge } from '@/components/ui'
import LoreIcon from './LoreIcon.jsx'

export default function GmOnlyBadge({ children = 'ГМ' }) {
  return (
    <Badge tone="violet" className="gm-only-badge">
      <LoreIcon name="eye" />
      {children}
    </Badge>
  )
}
