import { useMemo } from 'react'
import { STATS, abilityByCode } from '@/lib/utils/ability.js'
import { useCharacterAsiChoices } from '@/features/characters/queries.js'
import { useFeats } from '@/features/catalog/queries.js'
import { Skeleton } from '@/components/ui'

const abilityDisplayName = (raw) => {
  const code = String(raw ?? '').toUpperCase()
  return (
    abilityByCode[code]?.label ??
    STATS.find((s) => s.key.toUpperCase() === code)?.label ??
    raw
  )
}

// Аудит выборов игрока на уровнях (ASI-level choices): группируем по уровню,
// чтобы +к двум характеристикам на одном уровне не плодили лишние строки.
const groupByLevel = (choices, featNameById) => {
  const byLevel = new Map()
  for (const c of choices) {
    const level = c?.class_level
    if (level == null) continue
    if (!byLevel.has(level)) byLevel.set(level, { level, asi: [], feats: [] })
    const row = byLevel.get(level)
    const increases = Array.isArray(c?.increases) ? c.increases : []
    if (increases.length > 0) {
      for (const inc of increases) {
        row.asi.push({
          ability: abilityDisplayName(inc?.ability),
          amount: Number(inc?.amount) || 0,
        })
      }
    } else if (c?.choice_type === 'FEAT') {
      const featId = Number(c?.feat_id) || Number(c?.feat?.id)
      row.feats.push(
        c?.feat?.name ??
          featNameById?.get(featId) ??
          (featId ? `Черта #${featId}` : 'Черта'),
      )
    } else {
      row.asi.push({ ability: 'Повышение', amount: 0 })
    }
  }
  const rows = [...byLevel.values()]
  rows.sort((a, b) => Number(a.level) - Number(b.level))
  return rows
}

export default function PlayerChoices({ characterId }) {
  const { data: choices = [], isLoading } = useCharacterAsiChoices(characterId)
  const { data: featsCatalog = [] } = useFeats({ size: 100 })

  const featNameById = useMemo(
    () => new Map(featsCatalog.map((f) => [Number(f.id), f.name])),
    [featsCatalog],
  )
  const rows = useMemo(() => groupByLevel(choices, featNameById), [choices, featNameById])

  if (isLoading) {
    return (
      <div className="space-y-1" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 rounded border border-stone-800 px-2.5 py-1.5"
          >
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-wide text-stone-500">Выборы игрока</p>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-600">Выборов игрока на уровнях пока нет.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => {
            const parts = [].concat(
              row.asi.map(({ ability, amount }) => `${ability} ${amount > 0 ? `+${amount}` : amount}`),
              row.feats.map((name) => `Черта: ${name}`),
            )
            return (
              <li
                key={row.level}
                className="flex items-center justify-between gap-2 rounded border border-stone-800 px-2.5 py-1.5 text-xs"
              >
                <span className="shrink-0 font-medium text-stone-200">Ур. {row.level}</span>
                <span className="min-w-0 flex-1 truncate text-right text-stone-400">
                  {parts.join(', ') || 'улучшение характеристик'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}