// Растущая строка особенности (scaling на бэке): подпись + ступени
// «уровень → значение». Описание особенности одно на все уровни, меняется
// только эта строка — «Песнь отдыха»: «Доп. хиты» 1к6 на 2-м, 1к8 на 9-м,
// 1к10 на 13-м, 1к12 на 17-м. На листе персонажа показываем значение
// последней достигнутой ступени.
//
// Бэк хранит { label, steps: [{ level, value }] } со ступенями по возрастанию
// уровня или null («не растёт»). Черновик редактора — та же форма, но level
// может быть null, а строки — пустыми.

const LEVEL_MIN = 1
const LEVEL_MAX = 20

const hasSteps = (scaling) => Array.isArray(scaling?.steps) && scaling.steps.length > 0

// Последняя ступень, достигнутая на уровне level; null — ещё ниже первой.
export function scalingStepAt(scaling, level) {
  if (!hasSteps(scaling) || level == null) return null
  const reached = scaling.steps.filter((s) => s.level <= level)
  return reached.length > 0 ? reached[reached.length - 1] : null
}

// Значение последней достигнутой ступени; null — ещё ниже первой.
export const scalingValueAt = (scaling, level) => scalingStepAt(scaling, level)?.value ?? null

// Уровень умения на листе персонажа: если растущая строка уже поднялась выше
// уровня получения (Вдохновение барда 1-го → к8 на 5-м), показываем уровень
// этой ступени — умение «обновилось» там.
export function featureLevelAt(feature, level) {
  const base = feature?.level ?? null
  const step = scalingStepAt(feature?.scaling, level)
  return step && (base == null || step.level > base) ? step.level : base
}

// Следующая ступень после уровня level (чтобы подсказать «дальше — 1к10 на 13-м»).
export function nextScalingStep(scaling, level) {
  if (!hasSteps(scaling)) return null
  return scaling.steps.find((s) => level == null || s.level > level) ?? null
}

export const toScalingDraft = (scaling) =>
  hasSteps(scaling)
    ? { label: scaling.label ?? '', steps: scaling.steps.map((s) => ({ level: s.level, value: s.value })) }
    : { label: '', steps: [] }

const clampLevel = (raw) =>
  raw === '' || raw == null || Number.isNaN(Number(raw))
    ? null
    : Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.trunc(Number(raw))))

// Черновик → тело для бэка: обрезаем пробелы, выкидываем недозаполненные
// ступени, сортируем по уровню. Ни одной ступени — строки нет (null).
export function normalizeScaling(draft) {
  const steps = (draft?.steps ?? [])
    .map((s) => ({ level: clampLevel(s.level), value: String(s.value ?? '').trim() }))
    .filter((s) => s.level != null && s.value !== '')
    .sort((a, b) => a.level - b.level)
  if (steps.length === 0) return null
  return { label: String(draft?.label ?? '').trim(), steps }
}

// Что не так с черновиком (текст для мастера) или null, если его можно сохранять.
// minLevel — уровень самой особенности: строка не может начинаться раньше,
// чем персонаж вообще получает умение.
export function scalingError(draft, minLevel = null) {
  const scaling = normalizeScaling(draft)
  if (!scaling) return null
  if (!scaling.label) return 'Укажите подпись растущей строки — например, «Доп. хиты».'
  const levels = scaling.steps.map((s) => s.level)
  if (new Set(levels).size !== levels.length) return 'На одном уровне может быть только одно значение.'
  if (minLevel != null && levels[0] < minLevel) {
    return `Первое значение не может быть раньше ${minLevel}-го уровня — с него умение и даётся.`
  }
  return null
}

// Ступень раньше уровня особенности — подсветить её поле уровня.
export const stepBelowMin = (step, minLevel) => minLevel != null && step.level != null && step.level < minLevel

export const sameScaling = (a, b) => JSON.stringify(normalizeScaling(a)) === JSON.stringify(normalizeScaling(b))

// Пользовательский текст внутри Markdown: экранируем разметку, чтобы «*» или «_»
// в подписи не превратились в курсив.
const escapeMarkdown = (text) => String(text ?? '').replace(/([\\`*_{}[\]()#+\-.!|<>~])/g, '\\$1')

// Строка как Markdown-абзац — для RichText, между описанием и сводкой эффектов
// (tail), чтобы она шла до «У вас есть выбор…» и выглядела как остальной текст.
// Без level (каталог) — вся лесенка: «Доп. хиты: 1к6 (2 ур.) → 1к8 (9 ур.) → …».
// С level (лист персонажа) — текущее значение и подсказка о следующем.
export function scalingMarkdown(scaling, level = null) {
  if (!hasSteps(scaling)) return ''
  const label = `**${escapeMarkdown(scaling.label)}:**`
  if (level == null) {
    const ladder = scaling.steps.map((s) => `${escapeMarkdown(s.value)} (${s.level} ур.)`).join(' → ')
    return `${label} ${ladder}`
  }
  const current = scalingValueAt(scaling, level)
  const next = nextScalingStep(scaling, level)
  const now = current != null ? `**${escapeMarkdown(current)}**` : 'пока нет'
  return next ? `${label} ${now} · на ${next.level} ур. — ${escapeMarkdown(next.value)}` : `${label} ${now}`
}
