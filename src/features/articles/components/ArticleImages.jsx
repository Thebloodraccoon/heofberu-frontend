import { useRef, useState } from 'react'
import { articlesApi } from '@/features/articles/api.js'
import { Button, ErrorBox } from '@/components/ui'

// Галерея статьи: загрузка/подпись/удаление картинок. «В текст» вставляет
// ![подпись](url) в редактор через onInsert — Markdown-ссылка на публичный URL.
export default function ArticleImages({ articleId, images, onChanged, onInsert }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onChanged?.()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const upload = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    run(() => articlesApi.images.upload(articleId, file, { sortOrder: images.length }))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="heading-sm">Картинки</h3>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={upload} />
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Загрузка…' : 'Загрузить'}
        </Button>
      </div>
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      {images.length === 0 ? (
        <p className="text-sm text-stone-500">Картинок пока нет (JPEG, PNG, WebP, GIF, до 5 МБ).</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((img) => (
            <li key={img.id} className="space-y-2 rounded border border-stone-700/60 p-2">
              <img src={img.image_url} alt={img.caption ?? ''} className="h-32 w-full rounded object-cover" />
              <input
                className="input w-full"
                defaultValue={img.caption ?? ''}
                placeholder="Подпись"
                disabled={busy}
                onBlur={(e) => {
                  const caption = e.target.value.trim()
                  if (caption !== (img.caption ?? '')) run(() => articlesApi.images.update(articleId, img.id, { caption }))
                }}
              />
              <div className="flex gap-2">
                <Button size="xs" variant="ghost" onClick={() => onInsert?.(img)}>
                  В текст
                </Button>
                <Button size="xs" variant="danger" disabled={busy} onClick={() => run(() => articlesApi.images.remove(articleId, img.id))}>
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
