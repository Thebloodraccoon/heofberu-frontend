const WORD_NUMBERS = {
  один: 1,
  одного: 1,
  одну: 1,
  одно: 1,
  one: 1,
  два: 2,
  двух: 2,
  две: 2,
  two: 2,
  три: 3,
  трех: 3,
  трёх: 3,
  three: 3,
  четыре: 4,
  четырех: 4,
  четырёх: 4,
  four: 4,
}

export function expertiseGrantFromFeature(feature) {
  const text = `${feature?.name || ''} ${feature?.description || ''}`.toLowerCase()
  if (!/(экспертиз|expertise)/.test(text)) return 0

  const digit = text.match(/(\d+)/)
  if (digit) return Number(digit[1])

  for (const [word, n] of Object.entries(WORD_NUMBERS)) {
    if (text.includes(word)) return n
  }

  return 2
}

export function expertiseBudget(features = [], level) {
  return features
    .filter((f) => f.level == null || f.level <= level)
    .reduce((sum, f) => sum + expertiseGrantFromFeature(f), 0)
}
