import Drawer from '@/components/ui/Drawer.jsx'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Field, Input, Modal, RichText, RichTextEditor, RichTextField, TextField, ErrorBox } from '@/components/ui'
import { normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { persistFeatureEffects } from '@/features/catalog/config/editors/shared.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import FeatureEffectsEditor from './FeatureEffectsEditor.jsx'
import { catalogApi as api } from '@/features/catalog/api.js'

const LEVEL_MIN = 1
const LEVEL_MAX = 20

function blankFeature() {
  return { name: '', description: '', level: null }
}

const clampLevel = (raw) =>
  raw === '' || raw == null ? null : Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Number(raw)))

export default function FeatureModal({
  title,
  drawer = false,
  subtitle,
  value = null,
  showLevel = false,
  levelRequired = false,
  levelHint,
  onSave,
  onSaved,
  onClose,
}) {
  // Правка существующей особенности идёт микро-апдейтами (PATCH /features/{id}
  // по одному полю + PUT дерева эффектов сразу после изменения), поэтому общих
  // «Сохранить/Отмена» в этом режиме нет. Id фиксируем на монтировании:
  // родитель держит особенность по индексу в списке, а список пересортируется
  // после переименования или смены уровня.
  const [featureId] = useState(value?.id ?? null)
  const editing = featureId != null

  const [edit, setEdit] = useState(() => ({
    ...blankFeature(),
    ...(value ?? {}),
  }))

  const treeQ = useQuery({
    queryKey: ['catalog', 'featureTree', featureId ?? 'new'],
    enabled: editing,
    queryFn: async () => {
      const detail = await api.features.get(featureId)
      // Новый бэк встраивает всё дерево в GET /features/{id}; на старом —
      // догружаем двумя запросами.
      if (detail && (Array.isArray(detail.choice_groups) || Array.isArray(detail.skill_effects))) {
        return { ...normalizeEffectsTree(detail), effects_summary: detail.effects_summary ?? '' }
      }
      const [fx, groups] = await Promise.all([
        api.features.effects.get(featureId),
        api.features.choiceGroups.get(featureId),
      ])
      return { ...normalizeEffectsTree(fx), choice_groups: [...(groups ?? [])] }
    },
  })
  // При создании дерево живёт только в локальном стейте (уйдёт вместе с POST).
  // При правке локальная копия нужна лишь до ответа PUT — дальше показываем
  // перезапрошенные данные, там уже пересчитанная бэком сводка.
  const [localTree, setLocalTree] = useState(null)
  const tree = localTree ?? (treeQ.data ? { ...treeQ.data } : normalizeEffectsTree(undefined))

  const { push: pushStatus } = useToasts()
  const [navigating, setNavigating] = useState(false)
  const [tab, setTab] = useState('description')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const Container = drawer ? Drawer : Modal
  const [levelError, setLevelError] = useState(false)

  const setField = (key) => (e) =>
    setEdit((d) => ({
      ...d,
      [key]: key === 'level' ? clampLevel(e.target.value) : e.target.value,
    }))

  // Одно поле — один PATCH. Ошибку показывают сами TextField/RichTextField
  // (им нужно исключение), поэтому здесь её не перехватываем.
  const patchField = (key) => async (draft) => {
    const next = key === 'level' ? clampLevel(draft) : draft
    if (key === 'level' && levelRequired && next == null) {
      throw new Error('Укажите уровень, с которого умение доступно.')
    }
    setSaveError(null)
    const updated = await api.features.update(featureId, { [key]: next })
    setEdit((d) => ({ ...d, [key]: updated?.[key] ?? next }))
    await onSaved?.()
  }

  const setTree = async (next) => {
    setLocalTree(next)
    if (!editing) return
    setSaveError(null)
    pushStatus('Сохраняем…', 'Эффекты особенности', 'saving')
    try {
      // prev — ровно то, что сейчас в базе: наружу уйдут только изменившиеся
      // строки. persistFeatureEffects инвалидирует ['catalog','featureTree',id]
      // и ждёт перезапроса — после него локальную копию можно отпустить и
      // подхватить пересчитанную бэком сводку.
      await persistFeatureEffects(featureId, next, treeQ.data ?? normalizeEffectsTree())
      setLocalTree(null)
      pushStatus('Сохранено', 'Эффекты особенности')
      await onSaved?.()
    } catch (err) {
      setSaveError(err)
    }
  }

  const create = async () => {
    if (showLevel && levelRequired && edit.level == null) {
      setLevelError(true)
      return
    }
    setSaving(true)
    setSaveError(null)
    try { await onSave({ ...edit, effects: tree }) }
    catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  const loading = treeQ.isLoading && editing

  const summary = tree?.effects_summary && (
        <Field label="Сводка эффектов">
          <RichText
            value={tree.effects_summary}
            className="rounded-lg border border-stone-700/60 bg-stone-900/60 px-3 py-2 text-sm leading-relaxed text-stone-300"
          />
        </Field>
      )

  return (
    <Container
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="4xl"
      className={drawer ? 'catalog-editor-drawer' : undefined}
      closeLabel="Закрыть редактор особенности"
      scroll
      footer={!editing && !navigating &&
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" onClick={create} disabled={saving || !edit.name.trim() || loading}>
            {saving ? 'Сохраняем…' : drawer ? 'Создать' : 'Сохранить'}
          </Button>
        </>
      }
    >
      {saveError && <ErrorBox error={saveError} />}
      {drawer && !navigating && <EditorTabs tabs={[['description', 'Описание'], ['effects', 'Эффекты']]} value={tab} onChange={setTab} label="Разделы особенности" />}
      <div hidden={drawer && tab !== 'description'} className="space-y-4">
      {editing ? (
        <>
          <div className={showLevel ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
            <TextField
              label="Название"
              value={edit.name}
              onSave={patchField('name')}
              placeholder="Например, Тёмное зрение"
            />
            {showLevel && (
              <TextField
                label={levelRequired ? 'Уровень получения (обязательно)' : 'Уровень получения'}
                type="number"
                value={edit.level ?? ''}
                onSave={patchField('level')}
                placeholder={levelRequired ? 'Обязательно' : 'Пусто = сразу'}
              />
            )}
          </div>
          {showLevel && levelHint && <p className="text-xs text-stone-500">{levelHint}</p>}

          <RichTextField label="Описание" value={edit.description} onSave={patchField('description')} rows={4} />
        </>
      ) : (
        <>
          <div className={showLevel ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
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
        </>
      )}
      </div>
      <div hidden={drawer && tab !== 'effects'} className="space-y-4">
      {!navigating && summary}

      {loading ? (
        <p className="py-4 text-sm text-stone-500">Загрузка эффектов…</p>
      ) : (
        <FeatureEffectsEditor summary={summary} value={tree} onChange={setTree} inline={drawer} onNavigate={drawer ? setNavigating : undefined} />
      )}
      </div>
    </Container>
  )
}
