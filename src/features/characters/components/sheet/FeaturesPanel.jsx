import { useMemo } from 'react'
import { useCharacterFeatures, useCharacterFeats } from '@/features/characters/queries.js'
import { useUiSet } from '@/lib/uiState.js'

const SOURCE_LABELS = {
  CLASS: 'Класс',
  SUBCLASS: 'Подкласс',
  RACE: 'Раса',
  SUBRACE: 'Подраса',
  BACKGROUND: 'Предыстория',
  OTHER: 'Особая',
}

function AccordionItem({ name, badge, level, open, onToggle, children }) {
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
      </button>
      {open && (
        <div className="border-t border-stone-800 px-4 py-3 text-sm text-stone-400">{children}</div>
      )}
    </div>
  )
}

const SOURCE_RANK = { FEAT: 0, RACE: 1, SUBRACE: 2, BACKGROUND: 3, CLASS: 4, SUBCLASS: 4 }

export default function FeaturesPanel({ character }) {
  const characterId = character.id
  const { data: feats = [] } = useCharacterFeats(characterId)
  const { data: features = [] } = useCharacterFeatures(characterId)
  const [openKeys, toggleKey] = useUiSet(`features:${characterId}`)

  const items = useMemo(() => {
    const featNames = new Set(feats.map((cf) => (cf.feat?.name ?? '').toLowerCase()).filter(Boolean))
    const featItems = feats.map((cf) => ({
      key: `feat-${cf.id}`,
      name: cf.feat?.name || `Черта #${cf.feat_id}`,
      description: cf.feat?.description,
      notes: null,
      level: null,
      rank: 0,
      badge: 'Черта',
    }))
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
          badge: st === 'FEAT' ? 'Черта' : SOURCE_LABELS[st] ?? 'Особая',
        }
      })
      .filter((it) => !(it.badge === 'Черта' && featNames.has(it.name.toLowerCase())))
    return [...featItems, ...featureItems].sort(
      (a, b) => a.rank - b.rank || (a.level ?? 99) - (b.level ?? 99) || a.name.localeCompare(b.name),
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
