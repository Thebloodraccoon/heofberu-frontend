import { useRef } from 'react'

// Группа радиокнопок по WAI-ARIA: одна остановка Tab (выбранный вариант, иначе первый),
// ←/↑ и →/↓ — предыдущий/следующий (по кругу), Home/End — первый/последний; стрелка сразу
// выбирает. values — значения в порядке показа; radio(v) — пропсы для кнопки варианта.
export default function useRovingRadio(values, value, onChange) {
  const refs = useRef(new Map())
  const current = values.includes(value) ? value : values[0]

  const move = (from, key) => {
    const i = values.indexOf(from)
    const last = values.length - 1
    const next = { ArrowLeft: i - 1, ArrowUp: i - 1, ArrowRight: i + 1, ArrowDown: i + 1, Home: 0, End: last }[key]
    if (next === undefined) return false
    const target = values[(next + values.length) % values.length]
    onChange(target)
    refs.current.get(target)?.focus()
    return true
  }

  const radio = (v) => ({
    role: 'radio',
    'aria-checked': value === v,
    tabIndex: v === current ? 0 : -1,
    ref: (el) => (el ? refs.current.set(v, el) : refs.current.delete(v)),
    onClick: () => onChange(v),
    onKeyDown: (e) => {
      if (move(v, e.key)) e.preventDefault()
    },
  })

  return radio
}
