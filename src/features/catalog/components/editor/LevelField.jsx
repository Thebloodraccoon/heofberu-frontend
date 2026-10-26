import { useState } from 'react'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'

// Число в маленьком диапазоне: «[−] [ 6 ] уровень [+]» — можно вписать или подправить −/+
// (и ↑/↓ с клавиатуры), значение не выходит за min…max. required=false — пустое поле
// допустимо (null), в нём видна подсказка emptyText («Сразу», «Нет»…).
export function NumberStepper({ label, value, onChange, min = 0, max = 30, suffix = '', emptyText = '', required = false, hideLabel = false }) {
  const clamp = (n) => Math.min(max, Math.max(min, n))
  const shown = value == null ? '' : String(value)
  const [draft, setDraft] = useState(shown)
  // Пришло новое значение снаружи (−/+, сохранение) — показываем его в поле.
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setDraft(shown)
  }

  const commit = (raw) => {
    if (raw.trim() === '' || raw === '-') {
      if (!required) onChange(null)
      else setDraft(shown)
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) return setDraft(shown)
    onChange(clamp(Math.round(n)))
  }
  const step = (delta) => onChange(value == null ? clamp(delta > 0 ? Math.max(min, 0) : min) : clamp(value + delta))

  return (
    <div className="num-stepper">
      {!hideLabel && <span className="num-stepper-label">{label}</span>}
      <div className="num-stepper-control">
        <button type="button" className="character-dice-step" aria-label={`Меньше: ${label}`} disabled={value != null && value <= min} onClick={() => step(-1)}><LoreIcon name="minus" /></button>
        <input
          type="text"
          inputMode={min < 0 ? 'text' : 'numeric'}
          className="num-stepper-input"
          aria-label={label}
          value={draft}
          placeholder={required ? '—' : emptyText}
          onChange={(e) => setDraft(e.target.value.replace(min < 0 ? /[^\d-]/g : /\D/g, '').slice(0, 4))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(e.currentTarget.value)
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              step(e.key === 'ArrowUp' ? 1 : -1)
            }
          }}
        />
        {suffix && <span className="num-stepper-suffix">{value == null ? '' : suffix}</span>}
        <button type="button" className="character-dice-step" aria-label={`Больше: ${label}`} disabled={value != null && value >= max} onClick={() => step(1)}><LoreIcon name="plus" /></button>
      </div>
    </div>
  )
}

// Уровень получения / «с уровня»: 1–20, пусто — «Сразу».
export default function LevelField(props) {
  return <NumberStepper min={1} max={20} suffix="уровень" emptyText="Сразу" {...props} />
}
