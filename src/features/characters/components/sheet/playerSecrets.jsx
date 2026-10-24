import ArticleText from '@/features/articles/components/ArticleText.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { insertGmBlock } from '@/features/articles/insertGmBlock.js'

// Секреты игрока в личности и предыстории — тот же блок `:::gm … :::`, что у мастеров: его видят владелец, ГМ кампании
// и основатель, а публичная карточка героя (GET /characters/{id}/public) вырезает его на бэке.
export const PLAYER_SECRET_LABEL = 'Только для игрока и мастера'

export const PLAYER_SECRET_TOOL = { title: `${PLAYER_SECRET_LABEL}: блок не попадёт в публичную карточку`, label: <LoreIcon name="eyeOff" />, onClick: insertGmBlock }

export const PLAYER_SECRET_HINT = `Блоки «${PLAYER_SECRET_LABEL}» (кнопка с перечёркнутым глазом) не видны в публичной карточке героя.`

export const renderPlayerSecrets = (value) => <ArticleText value={value} empty="—" secretLabel={PLAYER_SECRET_LABEL} secretIcon="eyeOff" />
