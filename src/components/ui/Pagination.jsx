function Chevron({ double = false, previous = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`size-4 ${previous ? 'rotate-180' : ''}`}
    >
      <path
        d={double ? 'm5 5 7 7-7 7m7-14 7 7-7 7' : 'm9 5 7 7-7 7'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const buttonClass = 'inline-flex size-10 shrink-0 items-center justify-center rounded border border-stone-600 text-stone-200 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50'

export default function Pagination({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil((total ?? 0) / size))
  if (pages <= 1) return null
  return (
    <nav aria-label="Навигация по страницам" className="mt-5 flex items-center justify-center gap-1">
      <button type="button" className={buttonClass} aria-label="Первая страница" disabled={page <= 1} onClick={() => onPage(1)}>
        <Chevron double previous />
      </button>
      <button type="button" className={buttonClass} aria-label="Предыдущая страница" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <Chevron previous />
      </button>
      <span className="px-2 text-center text-sm tabular-nums text-stone-400">
        Стр. <b className="text-stone-100">{page}</b> из {pages}
      </span>
      <button type="button" className={buttonClass} aria-label="Следующая страница" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        <Chevron />
      </button>
      <button type="button" className={buttonClass} aria-label="Последняя страница" disabled={page >= pages} onClick={() => onPage(pages)}>
        <Chevron double />
      </button>
    </nav>
  )
}
