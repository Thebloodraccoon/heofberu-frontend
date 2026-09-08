import { STATS } from '@/lib/utils/ability.js'
import { useCharacterStats } from '@/features/characters/queries.js'
import { Skeleton } from '@/components/ui'

// Вкладовый тип источника приходит строками типа 'RACE'/'FEAT'/'GM' и т.п.
// подбираем тон и человекочитаемую подпись, если бэкенд её не прислал.
const TONE_BY_SOURCE = [
  [/feature|особенность|способность/i, 'default'],
  [/race|раса|subrace|подраса/i, 'good'],
  [/feat|черта/i, 'feat'],
  [/asi|повышен|выбор игрока/i, 'accent'],
  [/gm|правк/i, 'bad'],
]

const fallbackSourceName = (type) => {
  if (!type) return 'Источник'
  if (/feature|особенность|способность/i.test(type)) return 'Особенность'
  if (/race|раса/i.test(type)) return 'Раса'
  if (/subrace|подраса/i.test(type)) return 'Подраса'
  if (/feat|черта/i.test(type)) return 'Черта'
  if (/asi|выбор/i.test(type)) return 'Повышения'
  if (/gm|правк/i.test(type)) return 'Правки ГМа'
  return String(type)
}

// Иногда бэкенд присылает английские подписи вкладов — переводим их.
const reduceLabel = (label) => {
  const text = String(label ?? '')
  if (/subrace/i.test(text)) return 'Подраса'
  if (/racial|races?|раса/i.test(text)) return 'Раса'
  if (/class feature|особенность класса/i.test(text)) return 'Особенность класса'
  if (/gm +adjustment|правки гм/i.test(text)) return 'Правки ГМ'
  if (/asi|выбор игрока/i.test(text)) return 'Повышения'
  if (/level\s*\d+|ур\.?\s*\d+/i.test(text)) return 'Повышения'
  return text
}

const chipTone = (type) => {
  for (const [re, tone] of TONE_BY_SOURCE) {
    if (re.test(String(type ?? ''))) return tone
  }
  return 'dim'
}

const chipClass = (tone) => {
  const tones = {
    default: 'bg-ember/15 text-orange-200',
    good: 'bg-emerald-900/50 text-emerald-200',
    feat: 'bg-amber-900/50 text-amber-200',
    accent: 'bg-ember/15 text-orange-200',
    bad: 'bg-red-900/40 text-red-200',
    dim: 'bg-stone-800 text-stone-400',
  }
  return tones[tone] ?? tones.dim
}

const fmtAmount = (amount) => {
  const n = Number(amount) || 0
  return n > 0 ? `+${n}` : String(n)
}

const contribSource = (c) => c?.source ?? c?.source_type ?? c?.type ?? c?.name ?? c?.label ?? ''

const contribLabel = (c) =>
  reduceLabel(
    c?.label ?? c?.name ?? c?.source_name ?? fallbackSourceName(c?.source_type ?? c?.source ?? c?.type),
  )

const contribAmount = (c) => {
  const raw = c?.amount ?? c?.value ?? c?.bonus ?? c?.magnitude
  return Number(raw) || 0
}

export default function StatsCalculator({ characterId }) {
  const { data } = useCharacterStats(characterId)

  if (!data) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded border border-stone-800 bg-stone-900/70 px-3 py-2"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Расчёт характеристик</p>
      <ul className="space-y-2">
      {STATS.map((s) => {
        const view = data[s.key]
        if (!view) return null
        const sources = Array.isArray(view.contributions) ? view.contributions : []
        return (
          <li key={s.key} className="rounded border border-stone-800 bg-stone-900/70 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-stone-300">{s.label}</span>
              <span className="font-mono text-sm text-stone-100">
                {view.base} → <b className="text-ember">{view.total}</b>
              </span>
            </div>
            {sources.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {sources.map((c, i) => (
                  <span
                    key={`${c?.id ?? i}-${i}`}
                    className={`rounded px-1.5 py-0.5 text-[10px] ${chipClass(chipTone(contribSource(c)))}`}
                  >
                    {contribLabel(c)} {fmtAmount(contribAmount(c))}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-stone-600">Без бонусов</p>
            )}
          </li>
)
        })}
      </ul>
    </div>
  )
}