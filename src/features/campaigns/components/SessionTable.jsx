import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ErrorBox, Skeleton } from '@/components/ui'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { useCharacter } from '@/features/characters/queries.js'
import { campaignCharacterStatusLabels, sentenceCase } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useFullRoster, useSetAttendance } from '@/features/campaigns/queries.js'
import GmPanelDrawer from './GmPanelDrawer.jsx'

// Явка столбиком справа от хроники: все видят, кто был; ГМ отмечает прямо здесь (тот же PUT, что в форме сессии).
export function SessionAttendance({ campaign, session, isGm }) {
  const { push } = useToasts()
  const [marking, setMarking] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const { data: roster = [], isLoading } = useFullRoster(campaign.id, { enabled: marking })
  const attendance = useSetAttendance(campaign.id)
  const start = () => { setPicked(new Set(session.attendees.map((attendee) => attendee.participation_id))); setMarking(true) }
  const toggle = (id) => setPicked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const save = () => attendance.mutate({ sessionId: session.id, participationIds: [...picked] }, {
    onSuccess: () => { setMarking(false); push('Явка сохранена', undefined, 'success') },
    onError: (e) => push('Явка не сохранена', toCampaignError(e).message, 'error'),
  })

  return (
    <aside className="preset-section session-attendance" aria-label="Явка">
      <div className="flex items-center justify-between gap-2"><h2 className="heading-card">Явка</h2>{isGm && !marking && <button type="button" className="btn-edit-inline" onClick={start}>Отметить</button>}</div>
      {marking ? <>
        {isLoading ? <Skeleton className="h-9 w-64" /> : roster.length === 0 ? <span className="text-sm text-stone-400">В составе пока никого.</span>
          : <div className="session-attendance-list" role="group" aria-label="Отметить явку">{roster.map((participation) => <button key={participation.id} type="button" className="lore-chip" aria-pressed={picked.has(participation.id)} onClick={() => toggle(participation.id)}>{participation.character.name}{participation.status !== 'active' && <span className="text-hint">· {campaignCharacterStatusLabels[participation.status].toLowerCase()}</span>}</button>)}</div>}
        <span className="flex gap-2"><Button size="sm" disabled={attendance.isPending} onClick={save}>{attendance.isPending ? 'Сохраняем…' : 'Сохранить'}</Button><Button size="sm" variant="ghost" onClick={() => setMarking(false)}>Отмена</Button></span>
      </> : <>
        {session.attendees.length === 0 ? <span className="text-sm text-stone-400">{isGm ? 'Не отмечена.' : 'ГМ ещё не отметил, кто был.'}</span>
          : <ul className="session-attendance-list">{session.attendees.map((attendee) => <li key={attendee.participation_id} className="lore-chip">{attendee.character_name}<span className="text-hint">· {attendee.owner?.username}</span></li>)}</ul>}
      </>}
    </aside>
  )
}

function HpBar({ current, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0
  return (
    <span className="mt-1.5 flex items-center gap-2" aria-label={`ХП ${current} из ${max}`}>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800"><span className={`block h-full rounded-full ${pct > 50 ? 'bg-emerald-600' : pct > 25 ? 'bg-ember' : 'bg-red-700'}`} style={{ width: `${pct}%` }} /></span>
      <span className="shrink-0 text-[11px] tabular-nums text-stone-400">{current}/{max}</span>
    </span>
  )
}

// ponytail: по запросу листа на каждого героя стола — столы маленькие; при больших составах нужен HP в ответе состава.
function TableCharacter({ participation, onEdit }) {
  const { data: character, isLoading, error } = useCharacter(participation.character.id)
  return (
    <li className="catalog-record-card session-character">
      <span className="sheet-avatar shrink-0" aria-hidden="true">{(participation.character.name || '?').slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-bold text-stone-100">{participation.character.name}</span>
        <span className="block truncate text-xs text-stone-400">{[participation.owner?.username, `${participation.character.level} ур.`, sentenceCase(participation.character.class_name)].filter(Boolean).join(' · ')}</span>
        {isLoading ? <Skeleton className="mt-2 h-1.5 w-full" /> : error ? <span className="text-hint">ХП недоступны</span> : <HpBar current={character.current_hp} max={character.max_hp} />}
        {character?.temp_hp > 0 && <span className="text-xs text-emerald-300">Временные ХП: +{character.temp_hp}</span>}
      </span>
      <span className="flex flex-col gap-1.5">
        <button type="button" className="lore-chip" onClick={() => onEdit(participation.character)}><LoreIcon name="edit" />Быстрая правка</button>
        <Link className="lore-chip" to={`/characters/${participation.character.id}`}>Лист <LoreIcon name="arrow" /></Link>
      </span>
    </li>
  )
}

// Персонажи сессии под отзывами — только ГМ и только отмеченные в явке: HP одним взглядом и быстрая правка
// (ГМ-панель листа в Drawer).
export function SessionCharacters({ campaign, session }) {
  const { data: roster = [], isLoading, error, refetch } = useFullRoster(campaign.id)
  const [editing, setEditing] = useState(null)
  const attended = new Set(session.attendees.map((attendee) => attendee.participation_id))
  const present = roster.filter((participation) => attended.has(participation.id))
  return (
    <section className="preset-section mt-6" aria-label="Персонажи сессии">
      <h2 className="heading-card">Персонажи сессии</h2>
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading ? <Skeleton className="h-16 w-full" /> : present.length === 0 ? <p className="text-sm text-stone-400">Отметьте явку — здесь появятся персонажи этой сессии.</p>
        : <ul className="session-characters">{present.map((participation) => <TableCharacter key={participation.id} participation={participation} onEdit={setEditing} />)}</ul>}
      {editing && <GmPanelDrawer characterId={editing.id} name={editing.name} onClose={() => setEditing(null)} />}
    </section>
  )
}
