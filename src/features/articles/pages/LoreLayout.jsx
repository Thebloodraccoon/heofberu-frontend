import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import TagSelectModal from '@/features/articles/components/TagSelectModal.jsx'
import TypeSelectModal from '@/features/articles/components/TypeSelectModal.jsx'
import { parseTagIds, parseTypes } from '@/features/articles/filters.js'
import { useRememberTags, useTagsByIds } from '@/features/articles/queries.js'
import { useAuth } from '@/features/auth/useAuth.js'
import { Button, Input, PageHeader } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

const PLAYER_VIEW_KEY = 'lore:player-view'

const readPlayerView = () => {
  try {
    return sessionStorage.getItem(PLAYER_VIEW_KEY) === '1'
  } catch {
    return false
  }
}

const activeChip =
  'inline-flex shrink-0 items-center gap-1 rounded-full border border-ember bg-ember/20 px-2.5 py-1 text-xs font-medium text-ember transition hover:bg-ember/30'

// Owns the search/filters bar as a layout around <Outlet/> (list + article detail), so
// navigating to read an article never unmounts the search — only the outlet content swaps.
// Типы и теги выбираются в модалках (кнопки в строке поиска), под поиском — только
// активные фильтры. Also owns the GM «глазами игрока» toggle, handed to the outlet
// as { gmView, playerView }.
export default function LoreLayout() {
  const [params, setParams] = useSearchParams()
  const { isGM } = useAuth()

  // ГМ может посмотреть лор так, как его видит игрок: без черновиков, секретных
  // статей/связей и блоков :::gm. Флаг живёт в layout (не сбрасывается при переходе
  // к статье) и в sessionStorage (переживает перезагрузку вкладки).
  const [playerViewRaw, setPlayerViewRaw] = useState(readPlayerView)
  const playerView = isGM && playerViewRaw
  const togglePlayerView = () => {
    const next = !playerViewRaw
    setPlayerViewRaw(next)
    try {
      sessionStorage.setItem(PLAYER_VIEW_KEY, next ? '1' : '0')
    } catch {
      // приватный режим / выключенное хранилище — просто не запоминаем
    }
  }

  const q = params.get('q') ?? ''
  const types = parseTypes(params)
  const tagIds = parseTagIds(params)
  const matchAll = params.get('match') === 'all'
  const selectedTags = useTagsByIds(tagIds)
  const rememberTags = useRememberTags()
  const [modal, setModal] = useState(null) // null | 'types' | 'tags'

  const [input, setInput] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    setInput(q)
  }

  const location = useLocation()
  const navigate = useNavigate()
  const onList = location.pathname.replace(/\/+$/, '') === '/lore'

  // На списке фильтры меняют URL на месте. На открытой статье — переходим к списку
  // результатов (новая запись в истории: «назад» вернёт к статье).
  const updateParams = (patch) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (!('page' in patch)) next.delete('page')
    if (onList) setParams(next)
    else navigate({ pathname: '/lore', search: next.toString() ? `?${next}` : '' })
  }

  const submit = (e) => {
    e.preventDefault()
    updateParams({ q: input.trim() })
  }

  const setTypes = (next) => updateParams({ type: next.join(',') })
  const setTags = (ids) => updateParams({ tags: ids.join(','), match: ids.length > 1 && matchAll ? 'all' : '' })

  // Текст поиска и так виден в поле — в строке активных фильтров только типы и теги.
  const hasFilters = types.length > 0 || tagIds.length > 0

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        className="mb-3"
        title="Лор"
        subtitle="Своды знаний о мире Хеофберу — расы, регионы, фракции, события."
        actions={
          isGM && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={playerView ? 'primary' : 'ghost'}
                size="sm"
                aria-pressed={playerView}
                title="Показать лор так, как его видят игроки"
                onClick={togglePlayerView}
              >
                👁 {playerView ? 'Глазами игрока: вкл' : 'Глазами игрока'}
              </Button>
              <Link to="/gm/articles" className="text-sm text-stone-400 hover:text-ember">
                Редактор статей →
              </Link>
            </div>
          )
        }
      />
      {playerView && (
        <p className="mb-2 rounded border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-xs text-violet-200">
          Режим «глазами игрока»: скрыты черновики, статьи и связи «только для ГМ» и блоки-секреты.
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-5 space-y-2 bg-stone-950/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <form className="flex flex-wrap gap-2" onSubmit={submit}>
          <Input
            className="input-search min-w-56 flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Поиск по статьям…"
            aria-label="Поиск по статьям"
          />
          <Button type="button" variant={types.length ? 'primary' : 'ghost'} onClick={() => setModal('types')}>
            Типы
          </Button>
          <Button type="button" variant={tagIds.length ? 'primary' : 'ghost'} onClick={() => setModal('tags')}>
            Теги
          </Button>
          <Button type="submit">Найти</Button>
        </form>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Активные фильтры">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={activeChip}
                title="Убрать тип из фильтра"
                onClick={() => setTypes(types.filter((x) => x !== t))}
              >
                {articleTypeLabels[t]} <span aria-hidden="true">✕</span>
              </button>
            ))}
            {selectedTags.map((t) => (
              <button
                key={t.id}
                type="button"
                className={activeChip}
                title="Убрать тег из фильтра"
                onClick={() => setTags(tagIds.filter((x) => x !== t.id))}
              >
                #{t.name} <span aria-hidden="true">✕</span>
              </button>
            ))}
            <button
              type="button"
              className="ml-1 text-xs text-stone-500 underline-offset-2 hover:text-stone-300 hover:underline"
              onClick={() => updateParams({ type: '', tags: '', match: '' })}
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>

      {modal === 'types' && (
        <TypeSelectModal
          selected={types}
          onClose={() => setModal(null)}
          onApply={(next) => {
            setTypes(next)
            setModal(null)
          }}
        />
      )}
      {modal === 'tags' && (
        <TagSelectModal
          title="Фильтр по тегам"
          subtitle="Отметьте теги — покажем статьи с любым из них (или со всеми сразу)."
          selected={selectedTags}
          match={matchAll ? 'all' : 'any'}
          onClose={() => setModal(null)}
          onApply={(tags, match) => {
            rememberTags(tags)
            updateParams({
              tags: tags.map((t) => t.id).join(','),
              match: tags.length > 1 && match === 'all' ? 'all' : '',
            })
            setModal(null)
          }}
        />
      )}

      <Outlet context={{ gmView: isGM && !playerView, playerView }} />
    </div>
  )
}
