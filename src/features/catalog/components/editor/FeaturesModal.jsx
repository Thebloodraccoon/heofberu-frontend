import Drawer from '@/components/ui/Drawer.jsx'
import EditorTabs from '@/components/ui/EditorTabs.jsx'
import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Field, Input, Modal, RichTextEditor, RichTextField, TextField, ErrorBox } from '@/components/ui'
import { normalizeEffectsTree } from '@/lib/utils/featureEffects.js'
import { persistFeatureEffects } from '@/features/catalog/config/editors/shared.js'
import { normalizeScaling, sameScaling, scalingError, toScalingDraft } from '@/lib/utils/featureScaling.js'
import { useToasts } from '@/components/ToastProvider.jsx'
import FeatureEffectsEditor from './FeatureEffectsEditor.jsx'
import FeatureScalingEditor from './FeatureScalingEditor.jsx'
import LevelField from './LevelField.jsx'
import { catalogApi as api } from '@/features/catalog/api.js'

const LEVEL_MIN = 1
const LEVEL_MAX = 20

function blankFeature() {
  return { name: '', description: '', level: null, scaling: null }
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
  // Растущая строка правится черновиком: при создании он уходит вместе с POST,
  // при правке — одним PATCH по кнопке «Сохранить строку» (не на каждый символ).
  const [scalingDraft, setScalingDraft] = useState(() => toScalingDraft(value?.scaling))
  const [scalingSaving, setScalingSaving] = useState(false)
  const scalingDirty = editing && !sameScaling(scalingDraft, edit.scaling)

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
  const levelSaveRef = useRef(null)

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

  const saveScaling = async () => {
    setScalingSaving(true)
    setSaveError(null)
    try {
      const updated = await api.features.update(featureId, { scaling: normalizeScaling(scalingDraft) })
      const saved = updated?.scaling ?? null
      setEdit((d) => ({ ...d, scaling: saved }))
      setScalingDraft(toScalingDraft(saved))
      await onSaved?.()
    } catch (err) {
      setSaveError(err)
    } finally {
      setScalingSaving(false)
    }
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
    if (scalingError(scalingDraft, edit.level)) return
    setSaving(true)
    setSaveError(null)
    try { await onSave({ ...edit, scaling: normalizeScaling(scalingDraft), effects: tree }) }
    catch (error) { setSaveError(error) }
    finally { setSaving(false) }
  }

  const loading = treeQ.isLoading && editing


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
          <Button
            type="button"
            onClick={create}
            disabled={saving || !edit.name.trim() || loading || !!scalingError(scalingDraft, edit.level)}
          >
            {saving ? 'Сохраняем…' : drawer ? 'Создать' : 'Сохранить'}
          </Button>
        </>
      }
    >
      {saveError && <ErrorBox error={saveError} />}
      {drawer && !navigating && <EditorTabs tabs={[['description', 'Описание'], ['scaling', 'Растёт с уровнем'], ['static', 'Статичные эффекты'], ['choices', 'Выбор эффектов']]} value={tab} onChange={setTab} label="Разделы особенности" />}
      <div hidden={drawer && tab !== 'description'} className="space-y-4">
      {editing ? (
        <>
          <TextField
            label="Название *"
            value={edit.name}
            onSave={patchField('name')}
            placeholder="Например, Тёмное зрение"
          />
          {showLevel && (
            <LevelField
              label={levelRequired ? 'Уровень получения *' : 'Уровень получения'}
              required={levelRequired}
              value={edit.level}
              onChange={(level) => {
                // −/+ кликают сериями — сохраняем один раз, когда правка затихла.
                setEdit((d) => ({ ...d, level }))
                clearTimeout(levelSaveRef.current)
                levelSaveRef.current = setTimeout(() => patchField('level')(level).catch(setSaveError), 600)
              }}
            />
          )}

          <RichTextField label="Описание" value={edit.description} onSave={patchField('description')} rows={4} />
        </>
      ) : (
        <>
          <Field label="Название *">
            <Input value={edit.name} onChange={setField('name')} placeholder="Например, Тёмное зрение" autoFocus />
          </Field>
          {showLevel && (
            <LevelField
              label={levelRequired ? 'Уровень получения *' : 'Уровень получения'}
              required={levelRequired}
              value={edit.level}
              onChange={(level) => {
                setLevelError(false)
                setEdit((d) => ({ ...d, level }))
              }}
            />
          )}
          {showLevel && levelRequired && levelError && (
            <p className="mt-1 text-xs text-red-400">Выберите уровень, с которого умение доступно.</p>
          )}

          <Field label="Описание">
            <RichTextEditor value={edit.description} onChange={setField('description')} rows={4} />
          </Field>
        </>
      )}
      </div>
      <div hidden={drawer && tab !== 'scaling'}>
        <FeatureScalingEditor
          value={scalingDraft}
          onChange={setScalingDraft}
          minLevel={edit.level}
          actions={
            scalingDirty && (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setScalingDraft(toScalingDraft(edit.scaling))}>
                  Отменить
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveScaling}
                  disabled={scalingSaving || !!scalingError(scalingDraft, edit.level)}
                >
                  {scalingSaving ? 'Сохраняем…' : 'Сохранить строку'}
                </Button>
              </>
            )
          }
        />
      </div>
      {/* Две вкладки эффектов; вне панели (drawer=false) — обе части подряд, каждая со своим превью. */}
      {[['static', 'static'], ['choices', 'choice']].map(([tabKey, part]) => (
        <div key={tabKey} hidden={drawer && tab !== tabKey} className="space-y-4">
          {loading ? (
            <p className="py-4 text-sm text-stone-500">Загрузка эффектов…</p>
          ) : (
            <FeatureEffectsEditor part={part} summaryHtml={tree?.effects_summary ?? ''} value={tree} onChange={setTree} inline={drawer} onNavigate={drawer ? setNavigating : undefined} />
          )}
        </div>
      ))}
    </Container>
  )
}
