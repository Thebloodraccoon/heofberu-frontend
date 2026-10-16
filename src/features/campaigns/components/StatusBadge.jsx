import { Badge } from '@/components/ui'
import {
  campaignCharacterStatusLabels,
  campaignSessionStatusLabels,
  campaignStatusLabels,
  publicCampaignStatusLabels,
} from '@/lib/i18n/index.js'

// Один бейдж для всех статусов кампаний: подпись и тон берутся по виду статуса.
const KINDS = {
  campaign: [campaignStatusLabels, { planning: 'default', active: 'good', paused: 'accent', finished: 'violet', abandoned: 'bad' }],
  character: [campaignCharacterStatusLabels, { active: 'good', dead: 'bad', retired: 'violet', removed: 'default' }],
  session: [campaignSessionStatusLabels, { planned: 'accent', played: 'good', cancelled: 'bad' }],
  preset: [publicCampaignStatusLabels, { draft: 'default', published: 'good', archived: 'violet' }],
}

export default function StatusBadge({ kind, status }) {
  const [labels, tones] = KINDS[kind]
  return <Badge tone={tones[status] ?? 'default'}>{labels[status] ?? status}</Badge>
}
