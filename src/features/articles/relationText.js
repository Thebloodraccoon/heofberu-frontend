import { relationTypeLabels } from '@/lib/i18n'

export const relationLabel = (type) => relationTypeLabels[type] ?? type

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
