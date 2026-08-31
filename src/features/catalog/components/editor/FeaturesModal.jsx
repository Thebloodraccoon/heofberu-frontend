import { useEffect, useState } from 'react'
import { catalogApi as api } from '@/features/catalog/api.js'
import { abilityLabels } from '@/lib/i18n/index.js'
import { Button, Field, Input, Modal, Select, TextArea } from '@/components/ui'
import { SectionTitle, TrashIcon } from './editorShared.jsx'

function blankFeature() {
  return { name: '', description: '', level: null, ability_increases: [] }
}

function blankIncrease(ability = 'STR') {
  return { ability, amount: 1, new_cap: null }
}

export default function FeatureModal({ title, subtitle, value = null, showLevel = false, levelRequired = false, levelHint, onSave, onClose }) {
  const [edit, setEdit] = useState(() => ({ ...blankFeature(), ...(value ?? {}) }))
  const [levelError, setLevelError] = useState(false)

  const LEVEL_MIN = 1
  const LEVEL_MAX = 20

  // Фичи централизованы: увеличения характеристик подгружаем отдельным
  // запросом при открытии существующей фичи.
  useEffect(() => {
    if (!value?.id) return
    let alive = true
    api.features.abilityIncreases
      .get(value.id)
      .catch(() => null)
      .then((res) => {
        if (!alive) return
        const increases = (res?.ability_increases ?? []).map((a) => ({
          ability: a.ability,
          amount: a.amount,
          new_cap: a.new_cap == null ? null : a.new_cap,
        }))
        setEdit((d) => ({ ...d, ability_increases: increases }))
      })
    return () => {
      alive = false
    }
  }, [value?.id])

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

  const setIncrease = (i, key, val) =>
    setEdit((d) => ({
      ...d,
      ability_increases: d.ability_increases.map((row, j) => (j === i ? { ...row, [key]: val } : row)),
    }))

  const addIncrease = () =>
    setEdit((d) => {
      const used = new Set(d.ability_increases.map((r) => r.ability))
      const free = Object.keys(abilityLabels).find((k) => !used.has(k)) ?? 'STR'
      return { ...d, ability_increases: [...d.ability_increases, blankIncrease(free)] }
    })

  const removeIncrease = (i) =>
    setEdit((d) => ({ ...d, ability_increases: d.ability_increases.filter((_, j) => j !== i) }))

  const usedAbilities = new Set(edit.ability_increases.map((r) => r.ability))
  const abilitiesUsedUp = Object.keys(abilityLabels).every((k) => usedAbilities.has(k))

  const save = () => {
    if (showLevel && levelRequired && edit.level == null) {
      setLevelError(true)
      return
    }
    onSave(edit)
  }

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      size="lg"
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
        <TextArea value={edit.description} onChange={setField('description')} rows={4} />
      </Field>

      <div className="pt-3">
        <SectionTitle
          button={
            <button
              type="button"
              onClick={addIncrease}
              disabled={abilitiesUsedUp}
              className="my-[5px] rounded border border-stone-700 px-2 py-1 text-xs text-stone-300 transition hover:bg-stone-800 disabled:pointer-events-none disabled:opacity-40"
            >
              + Добавить
            </button>
          }
        >
          Изменение характеристик
        </SectionTitle>
        {edit.ability_increases.length === 0 ? (
          <p className="text-sm text-stone-500">Увеличений нет</p>
        ) : (
          <>
            {abilitiesUsedUp && (
              <p className="mb-2 text-xs text-stone-500">
                Все доступные варианты использованы — каждый вариант не может повторяться.
              </p>
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_4.5rem] items-center gap-2">
              <span className="whitespace-nowrap text-label-sm">Характеристика</span>
              <span className="whitespace-nowrap text-label-sm">Бонус</span>
              <span className="whitespace-nowrap text-label-sm">Новый максимум</span>
              <span className="whitespace-nowrap text-center text-label-sm text-transparent">—</span>
            </div>
            <div className="mt-1.5 space-y-2">
              {edit.ability_increases.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_4.5rem] items-center gap-2"
                >
                  <Select
                    value={row.ability}
                    onChange={(e) => setIncrease(i, 'ability', e.target.value)}
                    className="min-w-[190px]"
                  >
                    {Object.entries(abilityLabels).map(([k, v]) => (
                      <option key={k} value={k} disabled={usedAbilities.has(k) && k !== row.ability}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={-5}
                    max={5}
                    value={row.amount}
                    onChange={(e) => setIncrease(i, 'amount', Number(e.target.value) || 0)}
                    title="Величина"
                  />
                  <Input
                    type="number"
                    min={20}
                    max={30}
                    value={row.new_cap ?? ''}
                    onChange={(e) =>
                      setIncrease(
                        i,
                        'new_cap',
                        e.target.value === '' ? null : Math.min(30, Math.max(20, Number(e.target.value)))
                      )
                    }
                    placeholder="макс"
                    title="Новый предел характеристики (от 20 до 30)"
                  />
                  <button
                    type="button"
                    onClick={() => removeIncrease(i)}
                    className="inline-flex h-[40px] w-full items-center justify-center rounded border border-red-800 text-red-300 transition hover:bg-red-950/50"
                    title="Удалить"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
