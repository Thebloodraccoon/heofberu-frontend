import { useRef, useState } from 'react'
import { Button, ErrorBox, Field, Input } from '@/components/ui'
import Drawer from '@/components/ui/Drawer.jsx'
import SearchPickerList from '@/components/ui/SearchPickerList.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { sentenceCase } from '@/lib/i18n/index.js'
import { campaignsApi, isCampaignClosed, isCampaignGm } from '@/features/campaigns/api.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useAddToRoster } from '@/features/campaigns/queries.js'

const PAGE_SIZE = 10

// Список свободных персонажей — общий SearchPickerList: поиск по имени, ник игрока
// (отдельное поле в шапке списка), подгрузка при прокрутке.
export default function CandidatesDrawer({ campaign, onClose }) {
  const [playerDraft, setPlayerDraft] = useState('')
  const [player, setPlayer] = useState('')
  const [selected, setSelected] = useState(null)
  const [added, setAdded] = useState([])
  const [notice, setNotice] = useState('')
  const [addError, setAddError] = useState(null)
  const searchRef = useRef(null)
  const allowed = isCampaignGm(campaign) && !isCampaignClosed(campaign)
  const add = useAddToRoster(campaign.id)
  const chosen = selected && !added.includes(selected.id) ? selected : null
  // Любой новый поиск (имя или ник) снимает выбор.
  const resetSelection = () => { setSelected(null); setAddError(null) }
  const addCharacter = () => {
    if (!chosen || !allowed || add.isPending) return
    add.mutate(chosen.id, {
      onSuccess: () => {
        setAdded((current) => [...current, chosen.id])
        setSelected(null)
        setAddError(null)
        setNotice(`Персонаж «${chosen.name}» добавлен в состав. Можно выбрать следующего.`)
        searchRef.current?.querySelector('input[type="search"]')?.focus()
      },
      onError: (cause) => setAddError(toCampaignError(cause)),
    })
  }

  return (
    <Drawer title="Добавить персонажа" subtitle={campaign.title} onClose={() => { if (!add.isPending) onClose() }} closeLabel="Закрыть поиск персонажей" className="campaign-form-drawer" bodyClassName={allowed ? 'grant-picker-body' : ''} footer={
      <div className="article-filter-actions"><Button variant="ghost" disabled={add.isPending} onClick={onClose}>Закрыть</Button><Button disabled={!chosen || !allowed || add.isPending} onClick={addCharacter}><LoreIcon name="plus" />{add.isPending ? 'Добавляем…' : 'Добавить'}</Button></div>
    }>
      {!allowed ? <p className="lore-empty">{isCampaignClosed(campaign) ? 'Стол закрыт: состав больше не меняется.' : 'Добавлять персонажей может только ГМ этого стола.'}</p> : <div ref={searchRef} className="contents" onSubmitCapture={resetSelection}>
        <p className="text-hint mb-4">После добавления вы получите доступ к листу персонажа. Игрок увидит стол в разделе «Мои игры».</p>
        <SearchPickerList
          queryKey={queryKeys.campaigns.candidates(Number(campaign.id), { player })}
          fetchPage={({ search, ...page }) => campaignsApi.roster.candidates(Number(campaign.id), { ...page, q: search, player: player || undefined }).catch((cause) => { throw toCampaignError(cause) })}
          pageSize={PAGE_SIZE}
          label="Имя персонажа"
          placeholder="Найти персонажа…"
          submitLabel="Найти персонажей"
          exclude={(candidate) => added.includes(candidate.id)}
          emptyText={player ? 'Свободных персонажей с такими данными нет.' : 'Свободных персонажей пока нет.'}
          listClassName="grant-picker-list pr-1"
          header={<>
            <details className="campaign-player-search mb-4">
              <summary><LoreIcon name="filter" /><span>Ник игрока{player ? `: @${player}` : ''}</span><LoreIcon name="chevron" /></summary>
              <form onSubmit={(event) => { event.preventDefault(); if (!add.isPending) setPlayer(playerDraft.trim().replace(/^@/, '')) }} className="campaign-player-search-form"><Field label="Ник игрока"><Input value={playerDraft} onChange={(event) => setPlayerDraft(event.target.value)} placeholder="Например, @Ария" /></Field><Button type="submit" variant="ghost" disabled={add.isPending}>Найти игрока</Button></form>
            </details>
            {notice && <p className="campaign-drawer-success mb-4" role="status">{notice}</p>}
            {addError && <div role="alert" className="mb-4"><ErrorBox error={addError} onRetry={addCharacter} /></div>}
          </>}
        >
          {(candidates) => candidates.length > 0 && <ul className="campaign-candidates" aria-label="Свободные персонажи">{candidates.map((candidate) => <li key={candidate.id}>
            <button type="button" className="campaign-candidate-card" aria-pressed={selected?.id === candidate.id} disabled={add.isPending} onClick={() => { setSelected((current) => current?.id === candidate.id ? null : candidate); setAddError(null); setNotice('') }}>
              <span className="campaign-candidate-avatar" aria-hidden="true">{candidate.name?.slice(0, 1).toUpperCase()}</span>
              <span className="campaign-candidate-body"><strong className="campaign-picker-title">{candidate.name}</strong>{candidate.owner?.username && <span className="text-hint">@{candidate.owner.username}</span>}<span className="campaign-candidate-meta">{[candidate.level != null && `${candidate.level} ур.`, candidate.class_name && sentenceCase(candidate.class_name), candidate.race_name && sentenceCase(candidate.race_name)].filter(Boolean).join(' · ')}</span></span>
            </button>
          </li>)}</ul>}
        </SearchPickerList>
      </div>}
    </Drawer>
  )
}
