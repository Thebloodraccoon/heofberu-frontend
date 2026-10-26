import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterPendingChoices } from '@/features/characters/queries.js'
import LoreIcon from '@/features/articles/components/LoreIcon.jsx'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { Button, Modal, Skeleton } from '@/components/ui'
import SheetDrawer from '@/components/sheet/SheetDrawer.jsx'
import { groupComplete, initialAnswers, toAnswerItems } from '../choiceAnswers.jsx'
import { ChoiceGroupPicker, useChoiceCatalogs } from '../ChoiceGroupPicker.jsx'

// Форма ответа на группы выбора ОДНОГО granted-фичи — ключуется по
// character_feature_id снаружи, поэтому стейт черновика ответов сам
// сбрасывается при переходе к следующему гранту (без лишнего useEffect).
function GrantChoicesForm({ character, grant, total, otherFeatureNames, onClose, onError, presentation }) {
  const Surface = presentation === 'drawer' ? SheetDrawer : Modal
  const queryClient = useQueryClient()
  const groups = grant.groups ?? []
  const catalogs = useChoiceCatalogs(groups)

  const [answers, setAnswers] = useState(() => initialAnswers(groups))
  const [busy, setBusy] = useState(false)
  // Группы — по одной: раскрыта первая незаполненная, готовая сворачивается в
  // строку-итог и открывается следующая. attempted — «Подтвердить» нажата при
  // незаполненных группах: они подсвечиваются.
  const firstIncomplete = (all) => groups.find((g) => !groupComplete(all[g.id] ?? [], g))?.id ?? null
  const [openId, setOpenId] = useState(() => firstIncomplete(answers))
  const [attempted, setAttempted] = useState(false)
  const sectionRefs = useRef(new Map())

  const groupAnswer = (groupId) => answers[groupId] ?? []
  const setGroupAnswer = (group, list) => {
    const next = { ...answers, [group.id]: list }
    setAnswers(next)
    if (!groupComplete(groupAnswer(group.id), group) && groupComplete(list, group)) setOpenId(firstIncomplete(next))
  }
  // Заклинание или навык, названные в одной открытой группе гранта, в другой
  // не предлагаем: бэк отвечает 422 на повтор внутри одного гранта.
  const namedElsewhere = (groupId, field) =>
    new Set(
      groups
        .filter((g) => g.id !== groupId)
        .flatMap((g) => groupAnswer(g.id))
        .map((a) => a[field])
        .filter((v) => v != null),
    )

  const incomplete = groups.filter((g) => !groupComplete(groupAnswer(g.id), g)).length
  const allComplete = groups.length > 0 && incomplete === 0

  const submit = async () => {
    // Кнопка не блокируется: незаполненное подсвечиваем и показываем первое.
    if (!allComplete) {
      const id = firstIncomplete(answers)
      setAttempted(true)
      setOpenId(id)
      requestAnimationFrame(() => sectionRefs.current.get(id)?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }))
      return
    }
    setBusy(true)
    try {
      const body = { answers: groups.flatMap((g) => toAnswerItems(g.id, groupAnswer(g.id))) }
      await charactersApi.features.choices.answer(character.id, grant.character_feature_id, body)
      // Префикс ['characters', id] покрывает и выборы, и владения, и заклинания.
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) })
    } catch (e) {
      onError?.(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Surface
      title="Выборы"
      subtitle={allComplete ? 'Всё выбрано — можно подтверждать' : `Осталось выбрать: ${incomplete}`}
      onClose={onClose}
      size="lg"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Позже
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? 'Сохраняем…' : total > 1 ? 'Подтвердить и дальше' : 'Подтвердить'}
          </Button>
        </>
      }
    >
      <div className="mb-5 rounded-xl border border-ember/40 bg-gradient-to-br from-ember/10 to-transparent px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-stone-500">Особенность требует выбора</p>
            <p className="break-words text-lg font-semibold leading-tight text-stone-100">{grant.feature_name}</p>
          </div>
          {total > 1 && (
            <span className="shrink-0 rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400">
              ещё {total - 1}
            </span>
          )}
        </div>
      </div>

      {groups.length > 1 && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-stone-400">
            <span>Готово {groups.length - incomplete} из {groups.length}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-stone-800"
            role="progressbar"
            aria-label="Сделано выборов"
            aria-valuemin={0}
            aria-valuemax={groups.length}
            aria-valuenow={groups.length - incomplete}
          >
            <div
              className="h-full rounded-full bg-ember transition-all"
              style={{ width: `${((groups.length - incomplete) / groups.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <ChoiceGroupPicker
            key={group.id}
            group={group}
            list={groupAnswer(group.id)}
            onChange={(list) => setGroupAnswer(group, list)}
            open={groups.length === 1 || openId === group.id}
            onToggleOpen={groups.length > 1 ? () => setOpenId((id) => (id === group.id ? null : group.id)) : undefined}
            error={attempted && !groupComplete(groupAnswer(group.id), group)}
            sectionRef={(el) => (el ? sectionRefs.current.set(group.id, el) : sectionRefs.current.delete(group.id))}
            catalogs={catalogs}
            takenSpellIds={namedElsewhere(group.id, 'spell_id')}
            takenSkillIds={namedElsewhere(group.id, 'skill_id')}
            takenItemIds={namedElsewhere(group.id, 'item_id')}
          />
        ))}
      </div>

      {otherFeatureNames.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-stone-800 pt-3">
          <span className="text-xs text-stone-500">Дальше в очереди:</span>
          {otherFeatureNames.map((name, i) => (
            <span key={i} className="rounded-full border border-stone-700 px-2 py-0.5 text-xs text-stone-400">
              {name}
            </span>
          ))}
        </div>
      )}
    </Surface>
  )
}

// «Выборы» — доводит игрока по очереди через все гранты (особенности
// расы/класса/черты), у которых остались неотвеченные группы выбора
// (GET /grants/pending), отвечая через PATCH /features/{character_feature_id}/choices.
// Как только у текущего гранта не осталось групп, бэк отдаёт следующий грант
// в очереди. На листе персонажа открывается правой панелью (presentation
// "drawer", по умолчанию) — как повышение уровня; "modal" — для потоков,
// которые сами живут в центральной модалке.
export default function PendingChoicesModal({ character, onClose, onError, presentation = 'drawer' }) {
  const Surface = presentation === 'drawer' ? SheetDrawer : Modal
  const { data: pending = [], isLoading } = useCharacterPendingChoices(character.id)
  const current = pending[0] ?? null

  if (isLoading) {
    return (
      <Surface title="Выборы" onClose={onClose} size="sm">
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Surface>
    )
  }

  if (!current) {
    return (
      <Surface title="Выборы" onClose={onClose} size="sm" footer={presentation === 'drawer' ? <Button onClick={onClose}>Готово</Button> : undefined}>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <LoreIcon name="check" className="size-5" />
          </span>
          <p className="text-sm text-stone-300">Все выборы сделаны.</p>
        </div>
        {presentation !== 'drawer' && <div className="modal-actions pt-3 mt-4">
          <Button type="button" onClick={onClose}>
            Готово
          </Button>
        </div>}
      </Surface>
    )
  }

  return (
    <GrantChoicesForm
      key={current.character_feature_id}
      character={character}
      grant={current}
      total={pending.length}
      otherFeatureNames={pending.slice(1).map((g) => g.feature_name)}
      onClose={onClose}
      onError={onError}
      presentation={presentation}
    />
  )
}
