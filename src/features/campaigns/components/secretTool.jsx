import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { insertGmBlock } from '@/features/articles/insertGmBlock.js'

// Та же кнопка, что в редакторе статей: блок `:::gm … :::` бэк вырезает для игроков
// (описание кампании и пресета, хроника сессии, заметки ГМ).
export const SECRET_TOOL = { title: 'Секрет мастера: блок, скрытый от игроков', label: <LoreIcon name="eye" />, onClick: insertGmBlock }
