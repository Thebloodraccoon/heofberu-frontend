import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { articlesApi } from '@/features/articles/api.js'
import { useReplaceProposal } from '@/features/articles/queries.js'
import { FIELD_LABELS, fieldValue } from '@/features/articles/history.js'
import { hasConflictMarkers, mergeField } from '@/features/articles/proposalMerge.js'
import { Button, ErrorBox, Field, Modal, Skeleton, TextArea } from '@/components/ui'

const CONTENT_FIELDS = ['title', 'excerpt', 'article_type', 'subtype_id', 'visibility']

// Разрешение конфликтов предложения с текущей версией статьи — только для того, кто предложил
// (PUT разрешён ему одному, чтобы в истории под текстом стояло его имя). По конфликтным полям —
// выбор «текущее / моё», текст — правка черновика с маркерами (простое поле: WYSIWYG-редактор
// превратил бы строку «=======» в заголовок). Сохраняется полное содержимое с base_version = текущая.
export default function ProposalConflictDialog({ articleId, proposal, details, onClose, onResolved }) {
  const replace = useReplaceProposal(articleId)
  const sources = useQuery({
    queryKey: ['articles', articleId, 'proposals', 'merge-sources', proposal.id, proposal.base_version],
    queryFn: async () => {
      const [current, base, proposed] = await Promise.all([
        articlesApi.get(articleId),
        articlesApi.revisions.get(articleId, proposal.base_version),
        articlesApi.proposals.get(articleId, proposal.id),
      ])
      return { current: { ...current, subtype_id: current.subtype?.id ?? null }, base, proposed }
    },
    staleTime: Infinity,
  })
  const conflicts = details?.conflicts ?? []
  const bodyConflicts = details?.body_conflicts ?? []
  const [choice, setChoice] = useState(() => Object.fromEntries(conflicts.map((c) => [c.field, 'current'])))
  const [body, setBody] = useState(details?.merged_body ?? '')
  const [error, setError] = useState(null)

  const save = () => {
    setError(null)
    if (bodyConflicts.length && hasConflictMarkers(body)) {
      setError(new Error('В тексте остались маркеры конфликта (<<<<<<<, |||||||, =======, >>>>>>>): оставьте нужный вариант и удалите их.'))
      return
    }
    const { current, base, proposed } = sources.data
    const fields = Object.fromEntries(
      CONTENT_FIELDS.map((f) => {
        const conflict = conflicts.find((c) => c.field === f)
        return [f, conflict ? conflict[choice[f]] : mergeField(base[f], current[f], proposed[f])]
      }),
    )
    replace.mutate(
      {
        pid: proposal.id,
        body: {
          ...fields,
          body_markdown: details?.merged_body != null ? body : mergeField(base.body_markdown, current.body_markdown, proposed.body_markdown),
          change_note: proposed.change_note ?? null,
          base_version: current.version,
        },
      },
      { onSuccess: onResolved, onError: setError },
    )
  }

  return (
    <Modal
      title="Конфликт с текущей версией"
      subtitle={`Статью изменили после версии ${proposal.base_version}, и часть ваших правок пересеклась с чужими. Выберите, что оставить.`}
      size="2xl"
      scroll
      onClose={replace.isPending ? undefined : onClose}
      footer={
        <>
          <Button variant="ghost" disabled={replace.isPending} onClick={onClose}>Отмена</Button>
          <Button disabled={replace.isPending || !sources.data} onClick={save}>{replace.isPending ? 'Сохраняем...' : 'Сохранить предложение'}</Button>
        </>
      }
    >
      {sources.isLoading && <Skeleton className="h-24 w-full" />}
      {sources.error && <ErrorBox error={sources.error} onRetry={sources.refetch} />}
      {conflicts.map((c) => (
        <fieldset key={c.field} className="space-y-1.5 rounded-lg border border-stone-700/60 p-3">
          <legend className="text-label px-1">{FIELD_LABELS[c.field] ?? c.field}</legend>
          <p className="text-xs text-stone-500">Было: {fieldValue(c.field, c.base)}</p>
          {[['current', 'Сейчас в статье'], ['proposed', 'Ваше']].map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm text-stone-200">
              <input type="radio" name={`conflict-${c.field}`} checked={choice[c.field] === key} onChange={() => setChoice((v) => ({ ...v, [c.field]: key }))} />
              <span><span className="text-stone-400">{label}:</span> {fieldValue(c.field, c[key])}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {bodyConflicts.length > 0 && (
        <Field label={`Текст: конфликтов ${bodyConflicts.length}`}>
          <p className="text-xs text-stone-500">
            Между <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; current</code> и <code>=======</code> — то, что сейчас в статье (под <code>||||||| base</code> — как было),
            после <code>=======</code> до <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt; proposal</code> — ваше. Оставьте нужное и удалите маркеры.
          </p>
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={14} aria-label="Текст с конфликтами" className="font-mono text-xs" />
        </Field>
      )}
      {error && <ErrorBox error={error} />}
    </Modal>
  )
}
