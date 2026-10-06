import { relationCaptionLabels, relationTypeLabels } from '@/lib/i18n'

export const relationLabel = (type) => relationTypeLabels[type] ?? type

// Порядок связанных статей на странице: сначала «кто/где» (факты о статье), потом что в ней
// находится, потом отношения, в конце — упоминания. '*' — любое направление.
const SECTION_ORDER = [
  ['RULES', 'incoming'],
  ['LOCATED_IN', 'outgoing'],
  ['MEMBER_OF', 'outgoing'],
  ['PARENT_FACTION', 'outgoing'],
  ['RULES', 'outgoing'],
  ['PARTICIPATED_IN', 'outgoing'],
  ['LOCATED_IN', 'incoming'],
  ['MEMBER_OF', 'incoming'],
  ['PARENT_FACTION', 'incoming'],
  ['PARTICIPATED_IN', 'incoming'],
  ['ALLY_OF', '*'],
  ['ENEMY_OF', '*'],
  ['RELATIVE_OF', '*'],
  ['MENTIONS', 'outgoing'],
  ['MENTIONS', 'incoming'],
  ['SEE_ALSO', '*'],
]

// Короткие факты о самой статье — показываются строкой под заголовком, а не карточками.
const FACT_SECTIONS = new Set(['RULES:incoming', 'LOCATED_IN:outgoing', 'MEMBER_OF:outgoing', 'PARENT_FACTION:outgoing'])

export const relationCaption = (type, direction) =>
  relationCaptionLabels[type]?.[direction] ?? relationLabel(type)

// Связи статьи → группы [{ title, fact, rank, items }] по подписи, в порядке SECTION_ORDER.
// Связи с одинаковой подписью (обе стороны симметричной связи) попадают в одну группу.
export function groupRelations(relations) {
  const sections = new Map()
  for (const r of relations) {
    const title = relationCaption(r.relation_type, r.direction)
    if (!sections.has(title)) {
      const rank = SECTION_ORDER.findIndex(([type, dir]) => type === r.relation_type && (dir === '*' || dir === r.direction))
      sections.set(title, {
        title,
        rank: rank === -1 ? SECTION_ORDER.length : rank,
        fact: FACT_SECTIONS.has(`${r.relation_type}:${r.direction}`),
        items: [],
      })
    }
    sections.get(title).items.push(r)
  }
  return [...sections.values()].sort((a, b) => a.rank - b.rank)
}

// «Эта статья» как дополнение (incoming — другая статья её «находится в»/«правит»/…)
// должна стоять в падеже, который требует конкретный тип связи, а не всегда в
// винительном («X находится в эту статью» — ошибка, надо «в этой статье»). Там, где
// в лейбле уже есть предлог (LOCATED_IN/MEMBER_OF/PARTICIPATED_IN — «... в»,
// PARENT_FACTION — «... от»), здесь только форма существительного без предлога.
export const THIS_ARTICLE_CASE = {
  LOCATED_IN: 'этой статье', // находится в + предложный
  MEMBER_OF: 'этой статье', // состоит в + предложный
  PARTICIPATED_IN: 'этой статье', // участвовал в + предложный
  PARENT_FACTION: 'этой статьи', // дочерняя фракция от + родительный
  RULES: 'этой статьёй', // правит + творительный
  ALLY_OF: 'этой статьи', // союзник + родительный
  ENEMY_OF: 'этой статьи', // враг + родительный
  RELATIVE_OF: 'этой статьи', // родственник + родительный
  MENTIONS: 'эту статью', // упоминает + винительный
  SEE_ALSO: 'эту статью', // см. также + винительный
}

// Связь глазами текущей статьи: [подлежащее, сказуемое, дополнение].
// outgoing: «Эта статья» — «находится в» — «X» (подлежащее не склоняется, X как есть).
// incoming: «X» — «находится в» — «этой статье» (дополнение — «эта статья» в падеже,
// который требует тип связи, см. THIS_ARTICLE_CASE).
export function relationParts(direction, type, otherTitle) {
  const label = relationLabel(type)
  return direction === 'outgoing'
    ? ['Эта статья', label, otherTitle]
    : [otherTitle, label, THIS_ARTICLE_CASE[type] ?? 'эту статью']
}
