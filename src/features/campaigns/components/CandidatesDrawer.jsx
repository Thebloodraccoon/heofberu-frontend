import { useState } from 'react'
import { Button, ErrorBox, Field, Input, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import { useToasts } from '@/components/ToastProvider.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { sentenceCase } from '@/lib/i18n/index.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useAddToRoster, useCandidates } from '@/features/campaigns/queries.js'

const PAGE_SIZE = 10

// Поиск свободных персонажей (ни в одной кампании не «в игре») по нику игрока и имени.
// Видна только краткая карточка: лист откроется ГМ лишь после добавления.
export default function CandidatesDrawer({ campaign, onClose }) {
  const { push } = useToasts()
  const [draft, setDraft] = useState({ player: '', q: '' })
  const [applied, setApplied] = useState({ player: '', q: '' })
  const [page, setPage] = useState(1)
  const { data, isLoading, isPlaceholderData, error, refetch } = useCandidates(campaign.id, { player: applied.player || undefined, q: applied.q || undefined, page, size: PAGE_SIZE })
  const add = useAddToRoster(campaign.id)
  const candidates = data?.items ?? []
  const search = (event) => { event.preventDefault(); setApplied({ player: draft.player.trim(), q: draft.q.trim() }); setPage(1) }
  const addCharacter = (candidate) => add.mutate(candidate.id, {
    onSuccess: () => push(`${candidate.name} в кампании`, 'Теперь вы ведёте лист этого персонажа.', 'success'),
    onError: (e) => push('Не удалось добавить персонажа', toCampaignError(e).message, 'error'),
  })

  return (
    <Drawer title="Добавить персонажа" subtitle="Свободные персонажи игроков." onClose={onClose} closeLabel="Закрыть поиск персонажей" footer={<Button variant="ghost" className="w-full" onClick={onClose}>Готово</Button>}>
      <p className="campaign-warning" role="note">Игрока не спрашивают: персонаж сразу попадает в кампанию, а вы получаете доступ к его листу.</p>
      <form role="search" aria-label="Поиск свободных персонажей" className="campaign-candidate-search" onSubmit={search}>
        <Field label="Ник игрока"><Input value={draft.player} onChange={(event) => setDraft((current) => ({ ...current, player: event.target.value }))} placeholder="Любой" /></Field>
        <Field label="Имя персонажа"><Input value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Любое" /></Field>
        <Button type="submit" variant="ghost"><LoreIcon name="search" />Найти</Button>
      </form>
      {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
      {isLoading && <div className="space-y-2" aria-busy="true"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
      {!isLoading && !error && (candidates.length === 0
        ? <p className="lore-empty">{applied.player || applied.q ? 'Свободных персонажей с такими данными нет.' : 'Свободных персонажей пока нет.'}</p>
        : <ul className={`campaign-candidates ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Свободные персонажи">{candidates.map((candidate) => <li key={candidate.id} className="campaign-candidate">
          <span className="min-w-0"><span className="block font-display font-bold text-stone-100">{candidate.name}</span><span className="block truncate text-xs text-stone-400">{[candidate.owner?.username, `${candidate.level} ур.`, sentenceCase(candidate.class_name), candidate.race_name && sentenceCase(candidate.race_name)].filter(Boolean).join(' · ')}</span></span>
          <Button size="sm" disabled={add.isPending} aria-label={`Добавить ${candidate.name}`} onClick={() => addCharacter(candidate)}><LoreIcon name="plus" />Добавить</Button>
        </li>)}</ul>)}
      <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
    </Drawer>
  )
}
