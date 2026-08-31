import { useRef, useState } from 'react'
import { Button, Modal } from '@/components/ui'

const DEFAULT_IMG = '/default-img-verney.jpg'
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function ImageUploadBlock({
  imageUrl,
  onUpload,
  onRemove,
  busy = false,
  error = null,
}) {
  const inputRef = useRef(null)
  const [localError, setLocalError] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)

  const validate = (file) => {
    if (!file) return 'Файл не выбран'
    if (!ACCEPT.includes(file.type)) {
      return 'Поддерживаются только JPEG, PNG, WebP или GIF'
    }
    if (file.size > MAX_BYTES) return 'Изображение больше 5 МБ'
    return null
  }

  const handleChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    setLocalError(null)
    if (!file) return
    const problem = validate(file)
    if (problem) {
      setLocalError(problem)
      return
    }
    try {
      await onUpload(file)
    } finally {
      e.target.value = ''
    }
  }

  const shownUrl = imageUrl || DEFAULT_IMG

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-lg border border-stone-700/60 bg-stone-900/60 p-4">
      <div
        className="h-28 w-28 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-stone-700 bg-stone-900"
        onClick={() => setViewOpen(true)}
        title="Смотреть в полный размер"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setViewOpen(true)
          }
        }}
      >
        <img
          src={shownUrl}
          alt="Изображение записи"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          Каталожное изображение
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {imageUrl ? 'Загружено' : 'Сейчас отображается заглушка'} · JPEG, PNG, WebP или GIF до 5 МБ
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleChange}
            className="hidden"
            data-testid="catalog-image-input"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current && inputRef.current.click()}
          >
            {busy ? 'Загружаем...' : imageUrl ? 'Заменить' : 'Загрузить'}
          </Button>
          {imageUrl && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={onRemove}
            >
              Удалить
            </Button>
          )}
        </div>
        {(localError || error) && (
          <p className="mt-2 text-xs text-red-400">
            {(localError && localError.message) ||
              localError ||
              (error && (error.message || String(error)))}
          </p>
        )}
      </div>
      {viewOpen && (
        <Modal title="Просмотр изображения" onClose={() => setViewOpen(false)} size="4xl">
          <div className="flex justify-center">
            <img
              src={shownUrl}
              alt="Полноразмерное изображение"
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
