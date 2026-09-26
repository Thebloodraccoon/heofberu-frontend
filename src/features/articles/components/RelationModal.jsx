import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { articlesApi, RELATION_TYPES } from '@/features/articles/api.js'
import { useArticlesPage } from '@/features/articles/queries.js'
import { relationLabel } from '@/features/articles/relationText.js'
import useDebouncedValue from '@/features/articles/useDebouncedValue.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, ErrorBox, Field, Input, Modal, Select } from '@/components/ui'
import { articleTypeLabels } from '@/lib/i18n'

// Создание (relation не задан) и правка связи статьи. При создании выбирается
// статья (поиск по названию), направление, тип, заметка и секретность; при правке
// статья и направление фиксированы (бэк: PATCH меняет только тип/заметку/видимость).
export default function RelationModal({ articleId, articleTitle, relation, onClose, onSaved }) {
  const qc = useQueryClient()
  const editing = Boolean(relation)
  const [target, setTarget] = useState(relation?.article ?? null)
  const [direction, setDirection] = useState(relation?.direction ?? 'outgoing')
  const [type, setType] = useState(relation?.relation_type ?? 'SEE_ALSO')
  const [note, setNote] = useState(relation?.note ?? '')
  const [secret, setSecret] = useState(relation?.visibility === 'gm_only')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const debounced = useDebouncedValue(search.trim())
  const candidatesQ = useArticlesPage(
    { page: 1, size: 20, sort: 'title', ...(debounced ? { search: debounced } : {}) },
    { enabled: !editing && !target },
  )
  const candidates = (candidatesQ.data?.items ?? []).filter((a) => a.id !== articleId)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const save = async () => {
    setBusy(true)
    setError(null)
    const fields = { relation_type: type, note: note.trim() || null, visibility: secret ? 'gm_only' : 'public' }
    try {
      if (editing) {
        await articlesApi.relations.update(articleId, relation.id, fields)
      } else if (direction === 'outgoing') {
        await articlesApi.relations.create(articleId, { to_article_id: target.id, ...fields })
      } else {
        // «X → эта статья»: связь создаётся от имени другой статьи.
        await articlesApi.relations.create(target.id, { to_article_id: articleId, ...fields })
      }
      await qc.invalidateQueries({ queryKey: queryKeys.articles.relations(articleId) })
      if (target) await qc.invalidateQueries({ queryKey: queryKeys.articles.relations(target.id) })
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  // Превью всегда с «эта статья» на своём месте по direction — не полагаемся на
  // текст из relationParts (там для incoming дополнение склоняется по типу связи,
  // а не всегда «эту статью», так что сравнивать строки было бы хрупко).
  const verb = relationLabel(type)
  const otherTitle = target?.title ?? '…'
  const thisTitle = articleTitle ? `«${articleTitle}»` : 'эта статья'

  return (
    <Modal
      title={editing ? 'Изменить связь' : 'Новая связь'}
      size="2xl"
      scroll
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={busy || !target} onClick={save}>
            {busy ? 'Сохраняем…' : editing ? 'Сохранить' : 'Связать'}
          </Button>
        </>
      }
    >
      <p className="rounded border border-stone-800 bg-stone-950/50 px-3 py-2 text-sm text-stone-300">
        <span className="text-stone-100">{direction === 'outgoing' ? thisTitle : otherTitle}</span>{' '}
        <span className="text-ember">{verb}</span>{' '}
        <span className="text-stone-100">{direction === 'outgoing' ? otherTitle : thisTitle}</span>
        {secret && <span className="ml-2 text-xs text-violet-300">(секретно)</span>}
      </p>

      <Field label="Статья">
        {target ? (
          <div className="flex items-center justify-between gap-2 rounded border border-stone-700 px-3 py-2">
            <span className="text-sm text-stone-100">
              {target.title}{' '}
              <span className="text-xs text-stone-500">
                {articleTypeLabels[target.article_type] ?? target.article_type}
              </span>
            </span>
            {!editing && (
              <Button size="xs" variant="ghost" onClick={() => setTarget(null)}>
                Другая
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти статью по названию…"
              aria-label="Поиск статьи"
            />
            <ul className="max-h-60 overflow-y-auto rounded border border-stone-800">
              {candidates.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setTarget(a)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-stone-200 hover:bg-stone-800"
                  >
                    <span>{a.title}</span>
                    <span className="text-xs text-stone-500">{articleTypeLabels[a.article_type] ?? a.article_type}</span>
                  </button>
                </li>
              ))}
              {candidatesQ.data && candidates.length === 0 && (
                <li className="px-3 py-2 text-sm text-stone-500">Ничего не нашлось.</li>
              )}
            </ul>
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Направление">
          <Select value={direction} disabled={editing} onChange={(e) => setDirection(e.target.value)}>
            <option value="outgoing">Эта статья → другая</option>
            <option value="incoming">Другая → эта статья</option>
          </Select>
        </Field>
        <Field label="Тип связи">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {RELATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {relationLabel(t)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Заметка">
        <Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Необязательно" />
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-300">
        <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} />
        Секретная связь — видна только ГМ, даже если обе статьи публичные
      </label>

      {error && <ErrorBox error={error} onRetry={() => setError(null)} />}
    </Modal>
  )
}
