import { Button } from '@/components/ui'

export default function Pagination({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil((total ?? 0) / size))
  if (pages <= 1) return null
  return (
    <div className="mt-5 flex items-center justify-center gap-3">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Назад
      </Button>
      <span className="text-sm tabular-nums text-stone-400">
        Стр. <b className="text-stone-100">{page}</b> из {pages}
      </span>
      <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Вперёд →
      </Button>
    </div>
  )
}
