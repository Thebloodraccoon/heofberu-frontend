import { useState } from 'react'
import { Button, Field, Input, Select } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import { EMPTY_CHARACTER_FILTERS } from '../gmCharacterFilters.js'
import { sentenceCase } from '@/lib/i18n/index.js'

export default function GmCharacterFilters({ filters, classes, subclasses, players, onApply, onClose }) {
  const [draft, setDraft] = useState(filters)
  const [playerQuery, setPlayerQuery] = useState('')
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }))
  const levelValid = (value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 1)
  const valid = levelValid(draft.minLevel) && levelValid(draft.maxLevel) && (!draft.minLevel || !draft.maxLevel || Number(draft.minLevel) <= Number(draft.maxLevel))
  const visiblePlayers = players.filter((player) => player.name.toLocaleLowerCase('ru').includes(playerQuery.trim().toLocaleLowerCase('ru')))
  const availableSubclasses = subclasses.filter((subclass) => !draft.classId || Number(subclass.class_id) === Number(draft.classId))
  const apply = (next) => { onApply(next); onClose() }
  return (
    <Drawer title="Фильтры персонажей" subtitle="Уровень, путь героя и его игрок." onClose={onClose} footer={
      <div className="article-filter-actions">
        <Button variant="ghost" onClick={() => apply({ ...EMPTY_CHARACTER_FILTERS })}>Сбросить</Button>
        <Button disabled={!valid} onClick={() => apply(draft)}>Применить</Button>
      </div>
    }>
      <fieldset className="lore-filter-section">
        <legend>Уровень</legend>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="От"><Input type="number" min="1" step="1" value={draft.minLevel} onChange={(event) => update({ minLevel: event.target.value })} placeholder="Любой" /></Field>
          <Field label="До"><Input type="number" min="1" step="1" value={draft.maxLevel} onChange={(event) => update({ maxLevel: event.target.value })} placeholder="Любой" /></Field>
        </div>
        {!valid && <p className="mt-2 text-sm text-red-300" role="alert">Укажите целые уровни от 1. Верхняя граница должна быть не меньше нижней.</p>}
      </fieldset>
      <fieldset className="lore-filter-section">
        <legend>Класс и подкласс</legend>
        <div className="mt-3 space-y-3">
          <Field label="Класс"><Select value={draft.classId} onChange={(event) => update({ classId: event.target.value, subclassId: '' })}><option value="">Все классы</option>{classes.map((item) => <option key={item.id} value={String(item.id)}>{sentenceCase(item.name)}</option>)}</Select></Field>
          <Field label="Подкласс"><Select value={draft.subclassId} onChange={(event) => update({ subclassId: event.target.value })}><option value="">Все подклассы</option>{availableSubclasses.map((item) => <option key={item.id} value={String(item.id)}>{sentenceCase(item.name)}</option>)}</Select></Field>
        </div>
      </fieldset>
      <fieldset className="lore-filter-section">
        <legend>Игрок</legend>
        <Input className="mt-3 w-full" type="search" aria-label="Поиск игроков" placeholder="Найти игрока…" value={playerQuery} onChange={(event) => setPlayerQuery(event.target.value)} />
        <div className="gm-player-options" aria-label="Игроки">
          <button type="button" className="lore-chip" aria-pressed={!draft.playerId} onClick={() => update({ playerId: '' })}>Все игроки</button>
          {visiblePlayers.map((player) => <button key={player.id} type="button" className="lore-chip" aria-pressed={String(player.id) === draft.playerId} onClick={() => update({ playerId: String(player.id) })}>{player.name}</button>)}
          {visiblePlayers.length === 0 && <p className="text-sm text-stone-400">Игроков не найдено.</p>}
        </div>
      </fieldset>
    </Drawer>
  )
}
