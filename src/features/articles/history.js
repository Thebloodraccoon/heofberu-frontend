import { useAuth } from '@/features/auth/useAuth.js'
import { useUserNames } from '@/features/users/queries.js'
import { articleTypeLabels, articleVisibilityLabels } from '@/lib/i18n'

// Поля содержимого статьи (как в diff версий и предложений) и их человекочитаемые значения.
export const FIELD_LABELS = {
  title: 'Название',
  excerpt: 'Краткое описание',
  article_type: 'Тип',
  subtype_id: 'Подтип',
  visibility: 'Видимость',
}

export function fieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'article_type') return articleTypeLabels[value] ?? value
  if (field === 'visibility') return articleVisibilityLabels[value] ?? value
  return String(value)
}

export const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

// «вы» / имя / #id — подпись участника правки в истории и предложениях.
export function useWho() {
  const { user } = useAuth()
  const names = useUserNames()
  return (id) => (id == null ? 'неизвестен' : String(id) === String(user?.id) ? 'вы' : names.get(id) ?? `пользователь #${id}`)
}
