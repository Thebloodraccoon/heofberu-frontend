import { useMemo } from 'react'
import { useCharacterFeatures, useCharacterFeats } from '@/features/characters/queries.js'
import { useUiSet } from '@/lib/uiState.js'
import { abilityName } from '@/lib/utils/ability.js'

const SOURCE_LABELS = {
  CLASS: 'Класс',
  SUBCLASS: 'Подкласс',
  RACE: 'Раса',
  SUBRACE: 'Подраса',
  BACKGROUND: 'Предыстория',
  OTHER: 'Особая',
}

function AccordionItem({ name, badge, extra, level, open, onToggle, children }) {
  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <span className={`text-stone-500 transition ${open ? 'rotate-90' : ''}`}>›</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-100">{name}</span>
        {level != null && (
          <span className="rounded bg-stone-800 px-1.5 py-0.5 text-xs text-stone-400">ур. {level}</span>
        )}
        {badge && <span className="sheet-chip sheet-chip_on !py-0.5 text-[11px]">{badge}</span>}
        {extra && (
          <span className="shrink-0 rounded border border-emerald-700/60 bg-emerald-900/30 px-1.5 py-0.5 text-[11px] text-emerald-200">
            {extra}
          </span>
        )}
      </button>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3 text-sm text-stone-400">{children}</div>
      )}
    </div>
  )
}

const SOURCE_RANK = { FEAT: 0, OTHER: 1, RACE: 2, SUBRACE: 3, BACKGROUND: 4, CLASS: 5, SUBCLASS: 5 }

const grantedIncrease = (cf) => {
  const explicit = cf.ability_score_increase
  if (explicit?.ability != null) return explicit
  const options = cf.feat?.ability_score_increases ?? []
  const id = cf.ability_score_increase_id
  if (id != null) return options.find((a) => String(a.id) === String(id)) ?? null
  return options.length === 1 ? options[0] : null
}

export default function FeaturesPanel({ character }) {
  const characterId = character.id
  const { data: feats = [] } = useCharacterFeats(characterId)
  const { data: features = [] } = useCharacterFeatures(characterId)
  const [openKeys, toggleKey] = useUiSet(`features:${characterId}`)

  const items = useMemo(() => {
    const featNames = new Set(feats.map((cf) => (cf.feat?.name ?? '').toLowerCase()).filter(Boolean))
    const featItems = feats.map((cf) => {
      const inc = grantedIncrease(cf)
      return {
        key: `feat-${cf.id}`,
        name: cf.feat?.name || `Черта #${cf.feat_id}`,
        description: cf.feat?.description,
        notes: null,
        level: null,
        sub: 0,
        rank: 0,
        badge: 'Черта',
        extra: inc ? `+${inc.amount} к ${abilityName(inc.ability)}` : null,
      }
    })
    const featureItems = features
      .map((cf) => {
        const st = cf.feature?.source_type ?? 'OTHER'
        return {
          key: `feature-${cf.id}`,
          name: cf.feature?.name || `Свойство #${cf.feature_id}`,
          description: cf.feature?.description,
          notes: cf.notes,
          level: st === 'CLASS' || st === 'SUBCLASS' ? cf.feature?.level ?? null : null,
          rank: SOURCE_RANK[st] ?? 5,
          sub: st === 'SUBCLASS' ? 1 : 0,
          badge: st === 'FEAT' ? 'Черта' : SOURCE_LABELS[st] ?? 'Особая',
        }
      })
      .filter((it) => !(it.badge === 'Черта' && featNames.has(it.name.toLowerCase())))
    return [...featItems, ...featureItems].sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.level ?? 99) - (b.level ?? 99) ||
        a.sub - b.sub ||
        a.name.localeCompare(b.name),
    )
  }, [feats, features])

  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="text-sm text-stone-500">Пока ничего нет</p>}

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key}>
            <AccordionItem
              name={it.name}
              badge={it.badge}
              extra={it.extra}
              level={it.level}
              open={openKeys.includes(it.key)}
              onToggle={() => toggleKey(it.key)}
            >
              {it.description ? (
                <p className="whitespace-pre-wrap break-words">{it.description}</p>
              ) : (
                <p className="text-stone-500">Нет описания</p>
              )}
              {it.notes && <p className="mt-1.5 text-stone-500">Заметка: {it.notes}</p>}
            </AccordionItem>
          </li>
        ))}
      </ul>
    </div>
  )
}
