import { useRef, useState } from 'react'
import { articlesApi, IMAGE_MIME_TYPES, validateImageFile } from '@/features/articles/api.js'
import { Badge, Button, ErrorBox } from '@/components/ui'

// Загруженные картинки статьи (кнопкой или перетаскиванием, сразу несколько файлов).
// Показываются читателю только там, где вставлены в текст — «В текст» кладёт
// ![](url) в редактор через onInsert; подпись пишется там же, в Markdown.
// Уже вставленные (usedUrls) помечены; остальные игроки не увидят.
export default function ArticleImages({ articleId, images, usedUrls, onChanged, onInsert }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
      onChanged?.()
    }
  }

  const uploadFiles = (files) => {
    if (files.length === 0) return
    run(async () => {
      files.forEach(validateImageFile)
      for (const file of files) await articlesApi.images.upload(articleId, file)
    })
  }

  return (
    <div
      className={`space-y-3 rounded-lg border border-dashed transition ${
        dragOver ? 'border-ember bg-ember/10' : 'border-transparent'
      }`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragOver(false)
        uploadFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="heading-sub">Картинки</h3>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_MIME_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            uploadFiles(files)
          }}
        />
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Загрузка…' : 'Загрузить'}
        </Button>
      </div>
      <p className="text-xs text-stone-500">
        Перетащите файлы сюда или прямо в текст статьи (там же работает вставка из буфера). Игроки видят только
        картинки, вставленные в текст. JPEG, PNG, WebP, GIF, до 5 МБ.
      </p>
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => {
            const used = usedUrls?.has(img.image_url)
            return (
              <li key={img.id} className="space-y-2 rounded border border-stone-700/60 p-2">
                <div className="relative">
                  <img src={img.image_url} alt="" className="h-28 w-full rounded object-cover" />
                  <Badge tone={used ? 'accent' : 'default'} className="absolute left-1 top-1">
                    {used ? 'в тексте' : 'не вставлена'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => onInsert?.(img)}>
                    В текст
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    disabled={busy}
                    onClick={() => run(() => articlesApi.images.remove(articleId, img.id))}
                  >
                    Удалить
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
