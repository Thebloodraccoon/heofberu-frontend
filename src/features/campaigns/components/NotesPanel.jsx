import { useState } from 'react'
import { Button, ErrorBox, RichText, Skeleton } from '@/components/ui'
import Pagination from '@/components/ui/Pagination.jsx'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { toPlainText } from '@/lib/utils/richText.js'
import { formatDateTime } from '@/lib/utils/datetime.js'
import { toCampaignError } from '@/features/campaigns/errors.js'
import { useNotesPage } from '@/features/campaigns/queries.js'
import NoteDrawer from './NoteDrawer.jsx'

const PAGE_SIZE = 20

// Заметки ГМ колонкой по центру, как статья лора: список → заметка читается отрендеренным Markdown,
// «Изменить» открывает форму в Drawer.
export default function NotesPanel({ campaign }) {
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(null)
  const [readingId, setReadingId] = useState(null)
  const { data, isLoading, isPlaceholderData, error, refetch } = useNotesPage(campaign.id, { page, size: PAGE_SIZE })
  const notes = data?.items ?? []
  // Читаемую заметку берём из списка: после правки он перезапрашивается, после удаления заметка пропадает.
  const reading = notes.find((note) => note.id === readingId)

  return (
    <section aria-label="Заметки ГМ" className="campaign-panel mx-auto w-full max-w-3xl">
      {reading ? <article aria-label={reading.title}>
        <div className="lore-reading-toolbar">
          <button type="button" className="article-back" onClick={() => setReadingId(null)}><LoreIcon name="back" />Ко всем заметкам</button>
          <Button size="sm" variant="ghost" onClick={() => setOpen({ note: reading })}><LoreIcon name="edit" />Изменить</Button>
        </div>
        <h2 className="heading-section text-left">{reading.title}</h2>
        <p className="text-hint mt-1">Изменена {formatDateTime(reading.updated_at)} · видна только вам</p>
        <div className="mt-5"><RichText value={reading.body_markdown} empty="Пустая заметка." /></div>
      </article> : <>
        <div className="campaign-panel-header"><p className="text-muted">Ваши заготовки к кампании. Игроки их не видят.</p><Button onClick={() => setOpen({ note: null })}><LoreIcon name="plus" />Новая заметка</Button></div>
        {error && <ErrorBox error={toCampaignError(error)} onRetry={refetch} />}
        {isLoading && <div className="campaign-notes" aria-busy="true"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>}
        {!isLoading && !error && (notes.length === 0
          ? <p className="lore-empty">Заметок пока нет.</p>
          : <ul className={`campaign-notes ${isPlaceholderData ? 'opacity-60' : ''}`} aria-label="Список заметок">{notes.map((note) => <li key={note.id}>
            <button type="button" className="catalog-record-card campaign-note-card" onClick={() => setReadingId(note.id)}>
              <span className="font-display font-bold text-stone-100">{note.title}</span>
              <span className="campaign-note-excerpt">{toPlainText(note.body_markdown) || 'Пустая заметка.'}</span>
              <span className="text-hint">Изменена {formatDateTime(note.updated_at)}</span>
            </button>
          </li>)}</ul>)}
        <Pagination page={page} total={data?.total ?? 0} size={PAGE_SIZE} onPage={setPage} />
      </>}
      {open && <NoteDrawer key={open.note?.id ?? 'new'} campaign={campaign} note={open.note} onClose={() => setOpen(null)} />}
    </section>
  )
}
