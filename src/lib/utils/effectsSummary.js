// Сводка эффектов особенности (effects_summary с бэка) — HTML из двух частей с
// постоянными вступлениями: «<p>Вы получаете:</p><ul>…</ul>» (статичные
// эффекты) и «<p>У вас есть выбор:</p><ul>…</ul>» (группы выбора), любая может
// отсутствовать. Разбиваем по вступлениям и убираем их — у каждой части в
// редакторе своя плашка с заголовком.
const FIXED_INTRO = '<p>Вы получаете:</p>'
const CHOICES_INTRO = '<p>У вас есть выбор:</p>'

export function splitEffectsSummary(html) {
  const text = html ?? ''
  const at = text.indexOf(CHOICES_INTRO)
  const fixed = (at === -1 ? text : text.slice(0, at)).replace(FIXED_INTRO, '').trim()
  const choices = at === -1 ? '' : text.slice(at + CHOICES_INTRO.length).trim()
  return { fixed, choices }
}
