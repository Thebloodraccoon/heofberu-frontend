import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { charactersApi } from '@/features/characters/api.js'
import { useCharacterPendingChoices } from '@/features/characters/queries.js'
import { useSkills, useSpells } from '@/features/catalog/queries.js'
import { queryKeys } from '@/lib/api/queryKeys.js'
import { describeEffectBundle } from '@/lib/utils/effectBundle.js'
import { Button, Modal, Select, Skeleton } from '@/components/ui'

const CHOICE_TYPE_LABELS = {
  ABILITY_SCORE: 'Характеристика',
  SKILL: 'Навык',
  SAVING_THROW: 'Спасбросок',
  ARMOR: 'Доспехи',
  WEAPON: 'Оружие',
  SPELL: 'Заклинание',
}

// Форма ответа на группы выбора ОДНОГО granted-фичи — ключуется по
// character_feature_id снаружи, поэтому стейт черновика ответов сам
// сбрасывается при переходе к следующему гранту (без лишнего useEffect).
function GrantChoicesForm({ character, grant, otherFeatureNames, onClose, onError }) {
  const queryClient = useQueryClient()
  const { data: skillsCatalog = [] } = useSkills({ size: 100 })
  const { data: spellsCatalog = [] } = useSpells({ size: 100 })
  const skillNames = Object.fromEntries(skillsCatalog.map((s) => [s.id, s.name]))
  const spellNames = Object.fromEntries(spellsCatalog.map((s) => [s.id, s.name]))
  const names = { skillNames, spellNames }

  const groups = grant.groups ?? []

  // Группа без настоящего выбора (вариантов ровно pick_count — «выберите 1
  // из 1» и т.п.) — предвыбираем все её варианты сразу, иначе кнопка
  // «Подтвердить» остаётся заблокированной, а игроку не очевидно, что тут
  // вообще что-то нужно кликнуть.
  const [answers, setAnswers] = useState(() => {
    const init = {}
    for (const g of groups) {
      const options = g.options ?? []
      if (options.length > 0 && options.length === g.pick_count) {
        init[g.id] = options.map((o) => ({ choice_option_id: o.id, skill_id: null, spell_id: null }))
      }
    }
    return init
  })
  const [busy, setBusy] = useState(false)

  const groupAnswer = (groupId) => answers[groupId] ?? []
  const isSelected = (groupId, optionId) => groupAnswer(groupId).some((a) => a.choice_option_id === optionId)

  const toggleOption = (group, option) => {
    setAnswers((prev) => {
      const list = prev[group.id] ?? []
      if (list.some((a) => a.choice_option_id === option.id)) {
        return { ...prev, [group.id]: list.filter((a) => a.choice_option_id !== option.id) }
      }
      const next = group.pick_count === 1 ? [] : list
      if (next.length >= group.pick_count) return prev
      return { ...prev, [group.id]: [...next, { choice_option_id: option.id, skill_id: null, spell_id: null }] }
    })
  }

  const patchAnswer = (groupId, optionId, patch) =>
    setAnswers((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((a) => (a.choice_option_id === optionId ? { ...a, ...patch } : a)),
    }))

  const groupComplete = (group) => {
    const list = groupAnswer(group.id)
    if (list.length !== group.pick_count) return false
    return list.every((a) => {
      const opt = (group.options ?? []).find((o) => o.id === a.choice_option_id)
      if (!opt) return false
      if (opt.needs_skill && a.skill_id == null) return false
      if (opt.needs_spell && a.spell_id == null) return false
      return true
    })
  }

  const allComplete = groups.length > 0 && groups.every(groupComplete)

  const submit = async () => {
    setBusy(true)
    try {
      const body = {
        answers: groups.flatMap((g) =>
          groupAnswer(g.id).map((a) => ({
            choice_group_id: g.id,
            choice_option_id: a.choice_option_id,
            ...(a.skill_id != null ? { skill_id: a.skill_id } : {}),
            ...(a.spell_id != null ? { spell_id: a.spell_id } : {}),
          })),
        ),
      }
      await charactersApi.features.choices.answer(character.id, grant.character_feature_id, body)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.characters.pendingChoices(Number(character.id)) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.characters.answeredChoices(Number(character.id)) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(character.id)) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.characters.proficiencies(Number(character.id)) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.characters.spells(Number(character.id)) }),
      ])
    } catch (e) {
      onError?.(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Выборы"
      onClose={onClose}
      size="md"
      scroll
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Позже
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !allComplete}>
            {busy ? 'Сохраняем…' : 'Подтвердить'}
          </Button>
        </>
      }
    >
      <div className="mb-3 rounded-lg border border-ember/40 bg-ember/5 px-3 py-2">
        <p className="text-sm text-stone-500">Особенность требует выбора:</p>
        <p className="text-base font-semibold text-ember">{grant.feature_name}</p>
      </div>
      {otherFeatureNames.length > 0 && (
        <p className="mb-3 text-xs text-stone-500">Дальше в очереди: {otherFeatureNames.join(', ')}</p>
      )}
      <div className="space-y-4">
        {groups.map((group) => {
          const typeLabel = CHOICE_TYPE_LABELS[group.choice_type] ?? group.choice_type
          const list = groupAnswer(group.id)
          return (
            <div key={group.id} className="rounded-lg border border-stone-700/60 bg-stone-900/60 p-3">
              <p className="mb-2 text-sm font-medium text-stone-200">
                {typeLabel} — выберите {group.pick_count} из {(group.options ?? []).length}
              </p>
              <div className="space-y-1.5">
                {(group.options ?? []).map((option) => {
                  const selected = isSelected(group.id, option.id)
                  const answer = list.find((a) => a.choice_option_id === option.id)
                  return (
                    <div key={option.id}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? 'border-ember/80 bg-ember/10 text-orange-100'
                            : 'border-stone-700 bg-stone-800/50 text-stone-200 hover:border-ember/40'
                        }`}
                      >
                        <input
                          type={group.pick_count === 1 ? 'radio' : 'checkbox'}
                          name={`group-${group.id}`}
                          checked={selected}
                          onChange={() => toggleOption(group, option)}
                          className="checkbox-base mt-0.5"
                        />
                        <span>{describeEffectBundle(option, names)}</span>
                      </label>
                      {selected && option.needs_skill && (
                        <div className="mt-1.5">
                          <Select
                            value={answer?.skill_id ?? ''}
                            onChange={(e) =>
                              patchAnswer(group.id, option.id, {
                                skill_id: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Выберите навык…"
                          >
                            {skillsCatalog.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
                      {selected && option.needs_spell && (
                        <div className="mt-1.5">
                          <Select
                            value={answer?.spell_id ?? ''}
                            onChange={(e) =>
                              patchAnswer(group.id, option.id, {
                                spell_id: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            placeholder="Выберите заклинание…"
                          >
                            {spellsCatalog
                              .filter((sp) => {
                                const filter = (option.spell_effects ?? [])[0]
                                if (!filter?.spell_school) return true
                                return sp.school === filter.spell_school
                              })
                              .map((sp) => (
                                <option key={sp.id} value={sp.id}>
                                  {sp.name}
                                </option>
                              ))}
                          </Select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// Модалка «Выборы» — по аналогии с LevelUpModal: доводит игрока по очереди
// через все гранты (особенности расы/класса/черты), у которых остались
// неотвеченные группы выбора (GET /grants/pending), отвечая через
// PATCH /features/{character_feature_id}/choices. Как только у текущего
// гранта не осталось групп, бэк отдаёт следующий грант в очереди.
export default function PendingChoicesModal({ character, onClose, onError }) {
  const { data: pending = [], isLoading } = useCharacterPendingChoices(character.id)
  const current = pending[0] ?? null

  if (isLoading) {
    return (
      <Modal title="Выборы" onClose={onClose} size="sm">
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Modal>
    )
  }

  if (!current) {
    return (
      <Modal title="Выборы" onClose={onClose} size="sm">
        <p className="text-sm text-stone-400">Все выборы сделаны.</p>
        <div className="modal-actions pt-3 mt-4">
          <Button type="button" onClick={onClose}>
            Готово
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <GrantChoicesForm
      key={current.character_feature_id}
      character={character}
      grant={current}
      otherFeatureNames={pending.slice(1).map((g) => g.feature_name)}
      onClose={onClose}
      onError={onError}
    />
  )
}
