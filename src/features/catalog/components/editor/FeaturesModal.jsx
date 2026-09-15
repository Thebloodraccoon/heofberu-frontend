import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Field, Input, Modal, RichText, RichTextEditor } from '@/components/ui'
import { normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import FeatureEffectsEditor from './FeatureEffectsEditor.jsx'
import { catalogApi as api } from '@/features/catalog/api.js'

function blankFeature() {
  return { name: '', description: '', level: null }
}

export default function FeatureModal({
  title,
  subtitle,
  value = null,
  showLevel = false,
  levelRequired = false,
  levelHint,
  onSave,
  onClose,
}) {
  const [edit, setEdit] = useState(() => ({
    ...blankFeature(),
    ...(value ?? {}),
  }))

  const treeQ = useQuery({
    queryKey: ['catalog', 'featureTree', value?.id ?? 'new'],
    enabled: value?.id != null,
    queryFn: async () => {
      const detail = await api.features.get(value.id)
      // Новый бэк встраивает всё дерево в GET /features/{id}; на старом —
      // догружаем двумя запросами.
      if (detail && (Array.isArray(detail.choice_groups) || Array.isArray(detail.skill_effects))) {
        return { ...normalizeEffectsTree(detail), effects_summary: detail.effects_summary ?? '' }
      }
      const [fx, groups] = await Promise.all([
        api.features.effects.get(value.id),
        api.features.choiceGroups.get(value.id),
      ])
      return { ...normalizeEffectsTree(fx), choice_groups: [...(groups ?? [])] }
    },
  })
  // Пока GM не начал править эффекты, дерево живёт в query-данных; первая же
  // правка уводит редактор в локальный стейт (без повторных запросов).
  const [localTree, setLocalTree] = useState(null)
  const tree = localTree ?? (treeQ.data ? { ...treeQ.data } : normalizeEffectsTree(undefined))
  const setTree = (next) => setLocalTree(next)

  const [levelError, setLevelError] = useState(false)

  const LEVEL_MIN = 1
  const LEVEL_MAX = 20

  const setField = (key) => (e) =>
    setEdit((d) => ({
      ...d,
      [key]:
        key === 'level'
          ? e.target.value === ''
            ? null
            : Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Number(e.target.value)))
          : e.target.value,
    }))

  const save = () => {
    if (showLevel && levelRequired && edit.level == null) {
      setLevelError(true)
      return
    }
    onSave({ ...edit, effects: tree })
  }

  const loading = treeQ.isLoading && value?.id != null

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="4xl"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={save}>
            Сохранить
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Название">
          <Input value={edit.name} onChange={setField('name')} placeholder="Например, Тёмное зрение" autoFocus />
        </Field>
        {showLevel && (
          <Field label={levelRequired ? 'Уровень получения (обязательно)' : 'Уровень получения'}>
            <Input
              type="number"
              min={LEVEL_MIN}
              max={LEVEL_MAX}
              value={edit.level ?? ''}
              onChange={(e) => {
                setLevelError(false)
                setField('level')(e)
              }}
              placeholder={levelRequired ? 'Обязательно' : 'Пусто = сразу'}
            />
          </Field>
        )}
      </div>
      {showLevel && levelRequired && levelError && (
        <p className="mt-1 text-xs text-red-400">Укажите уровень, с которого умение доступно.</p>
      )}
      {showLevel && levelHint && <p className="text-xs text-stone-500">{levelHint}</p>}

      <Field label="Описание">
        <RichTextEditor value={edit.description} onChange={setField('description')} rows={4} />
      </Field>

      {loading ? (
        <p className="py-4 text-sm text-stone-500">Загрузка эффектов…</p>
      ) : (
        <FeatureEffectsEditor value={tree} onChange={setTree} />
      )}
    </Modal>
  )
}