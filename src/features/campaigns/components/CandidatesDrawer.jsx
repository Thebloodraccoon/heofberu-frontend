import { useRef, useState } from 'react'
import { Button, ErrorBox, Field, Input, Skeleton } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchToolbar from '@/components/ui/SearchToolbar.jsx'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { sentenceCase } from '@/lib/i18n/index.js'
import { isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useAddToRoster, useCandidates } from '@/features/campaigns/queries.js'

const PAGE_SIZE = 10

export default function CandidatesDrawer({ campaign, onClose }) {
  const [draft, setDraft] = useState({ player: '', q: '' })
  const [applied, setApplied] = useState({ player: '', q: '' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [added, setAdded] = useState([])
  const [notice, setNotice] = useState('')
  const [addError, setAddError] = useState(null)
  const resultsRef = useRef(null)
  const searchRef = useRef(null)
  const allowed = isCampaignGm(campaign) && !isCampaignClosed(campaign)
  const query = useCandidates(campaign.id, { player: applied.player || undefined, q: applied.q || undefined, page, size: PAGE_SIZE }, { enabled: allowed })
  const { data, isLoading, isPlaceholderData, error, refetch } = query
  const add = useAddToRoster(campaign.id)
  // Локально скрываем уже добавленных, даже если обновлённый ответ ещё не пришёл.
  const candidates = (data?.items ?? []).filter((candidate) => !added.includes(candidate.id))
  const chosen = candidates.find((candidate) => candidate.id === selected)
  const search = () => {
    if (add.isPending) return
    setApplied({ player: draft.player.trim().replace(/^@/, ''), q: draft.q.trim() })
    setPage(1)
    setSelected(null)
    setAddError(null)
  }
  const addCharacter = () => {
    if (!chosen || !allowed || add.isPending || isPlaceholderData || error) return
    add.mutate(chosen.id, {
      onSuccess: () => {
        setAdded((current) => [...current, chosen.id])
        setSelected(null)
        setAddError(null)
        setNotice(`Персонаж «${chosen.name}» добавлен в состав. Можно выбрать следующего.`)
        setPage(1)
        searchRef.current?.querySelector('input')?.focus()
      },
      onError: (cause) => setAddError(toCampaignError(cause)),
    })
  }

  return (
    <Drawer title="Добавить персонажа" subtitle={campaign.title} onClose={() => { if (!add.isPending) onClose() }} closeLabel="Закрыть поиск персонажей" className="campaign-form-drawer" footer={
      <div className="article-filter-actions"><Button variant="ghost" disabled={add.isPending} onClick={onClose}>Закрыть</Button><Button disabled={!chosen || !allowed || add.isPending || isPlaceholderData || Boolean(error)} onClick={addCharacter}><LoreIcon name="plus" />{add.isPending ? 'Добавляем…' : 'Добавить'}</Button></div>
    }>
      {!allowed ? <p className="lore-empty">{isCampaignClosed(campaign) ? 'Стол закрыт: состав больше не меняется.' : 'Добавлять персонажей может только ГМ этого стола.'}</p> : <div className="campaign-drawer-screen">
        <p className="text-hint">После добавления вы получите доступ к листу персонажа. Игрок увидит стол в разделе «Мои игры».</p>
        <div ref={searchRef}><SearchToolbar query={draft.q} onQueryChange={(q) => setDraft((current) => ({ ...current, q }))} onSearch={search} label="Имя персонажа" placeholder="Найти персонажа…" submitLabel="Найти персонажей" /></div>
        <details className="campaign-player-search">
          <summary><LoreIcon name="filter" /><span>Ник игрока{applied.player ? `: @${applied.player}` : ''}</span><LoreIcon name="chevron" /></summary>
          <form onSubmit={(event) => { event.preventDefault(); search() }} className="campaign-player-search-form"><Field label="Ник игрока"><Input value={draft.player} onChange={(event) => setDraft((current) => ({ ...current, player: event.target.value }))} placeholder="Например, @Ария" /></Field><Button type="submit" variant="ghost" disabled={add.isPending}>Найти игрока</Button></form>
        </details>
        {notice && <p className="campaign-drawer-success" role="status">{notice}</p>}
        {addError && <div role="alert"><ErrorBox error={addError} onRetry={addCharacter} /></div>}
        <div ref={resultsRef} aria-busy={isLoading || isPlaceholderData}>
          {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
          {isLoading && <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
          {!isLoading && !error && <>
            <p className="text-hint mb-3">Найдено: {data?.total ?? 0}</p>
            {candidates.length === 0 ? <p className="lore-empty">{applied.player || applied.q ? 'Свободных персонажей с такими данными нет.' : 'Свободных персонажей пока нет.'}</p> : <ul className="campaign-candidates" aria-label="Свободные персонажи">{candidates.map((candidate) => <li key={candidate.id}>
              <button type="button" className="campaign-candidate-card" aria-pressed={selected === candidate.id} disabled={add.isPending || isPlaceholderData} onClick={() => { setSelected((current) => current === candidate.id ? null : candidate.id); setAddError(null); setNotice('') }}>
                <span className="campaign-candidate-avatar" aria-hidden="true">{candidate.name?.slice(0, 1).toUpperCase()}</span>
                <span className="campaign-candidate-body"><strong className="campaign-picker-title">{candidate.name}</strong>{candidate.owner?.username && <span className="text-hint">@{candidate.owner.username}</span>}<span className="campaign-candidate-meta">{[candidate.level != null && `${candidate.level} ур.`, candidate.class_name && sentenceCase(candidate.class_name), candidate.race_name && sentenceCase(candidate.race_name)].filter(Boolean).join(' · ')}</span></span>
              </button>
            </li>)}</ul>}
            <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={(next) => { if (add.isPending) return; setPage(next); setSelected(null); setAddError(null); resultsRef.current?.scrollIntoView({ block: 'start' }) }} />
          </>}
        </div>
      </div>}
    </Drawer>
  )
}
