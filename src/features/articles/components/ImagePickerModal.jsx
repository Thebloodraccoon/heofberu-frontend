import { useEffect, useRef, useState } from 'react'
import { IMAGE_MIME_TYPES } from '@/features/articles/api.js'
import { Badge, Button, ErrorBox, Modal } from '@/components/ui'

// Кнопка 🖼 в конструкторе: вставить в текст уже загруженную картинку статьи или
// загрузить новые. onInsert(urls) вставляет по месту курсора; onUpload(file) => { src }
// загружает один файл в картинки статьи (с проверкой типа/размера).
export default function ImagePickerModal({ images, usedUrls, onInsert, onUpload, onClose }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const uploadNew = async (files) => {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    const urls = []
    try {
      for (const file of files) urls.push((await onUpload(file)).src)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
    // Вставляем то, что успело загрузиться, даже если на каком-то файле упало.
    if (urls.length) onInsert(urls)
  }

  return (
    <Modal
      title="Вставить картинку"
      subtitle="Выберите уже загруженную или загрузите новую — она встанет на место курсора."
      size="4xl"
      scroll
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_MIME_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              uploadNew(files)
            }}
          />
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Загрузка…' : 'Загрузить новую'}
          </Button>
        </>
      }
    >
      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
      {images.length === 0 ? (
        <p className="text-sm text-stone-500">У статьи пока нет картинок — загрузите новую (JPEG, PNG, WebP, GIF, до 5 МБ).</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => {
            const used = usedUrls?.has(img.image_url)
            return (
              <li key={img.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onInsert([img.image_url])}
                  className="group relative block w-full overflow-hidden rounded border border-stone-700 transition hover:border-ember focus:border-ember focus:outline-none"
                  title="Вставить в текст"
                >
                  <img src={img.image_url} alt="" className="h-32 w-full object-cover transition group-hover:opacity-90" />
                  {used && (
                    <Badge tone="accent" className="absolute left-1 top-1">
                      уже в тексте
                    </Badge>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
