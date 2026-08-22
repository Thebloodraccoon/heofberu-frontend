import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepClass from '@/features/characters/components/wizard/StepClass.jsx'

const classes = [
  { id: 1, name: 'Воин', hit_dice: 'D8' },
  { id: 2, name: 'Волшебник', hit_dice: 'D6' },
]

const classDetail = {
  id: 1,
  name: 'Воин',
  hit_dice: 'D8',
  skill_choice_count: 2,
  spellcasting_ability: null,
  description: 'Мастер войны',
  saving_throws: [{ ability: 'STR' }, { ability: 'CON' }],
  primary_abilities: [{ ability: 'STR' }],
  starting_items: [],
  available_skills: [
    { id: 1, name: 'Атлетика', ability: 'STR' },
    { id: 2, name: 'История', ability: 'INT' },
    { id: 3, name: 'Восприятие', ability: 'WIS' },
  ],
  features: [
    { id: 1, name: 'Второе дыхание', level: 2, description: 'Восстановление хитов' },
    { id: 2, name: 'Дополнительная атака', level: 5, description: '' },
    { id: 3, name: 'Боевой дух', level: null, description: '' },
  ],
  spell_slot_progression: [
    { class_level: 1, spell_level: 'CANTRIP', slots: 2 },
    { class_level: 3, spell_level: 'LEVEL_1', slots: 2 },
    { class_level: 5, spell_level: 'LEVEL_2', slots: 2 },
  ],
  subclasses: [{ id: 11, name: 'Лезвие горы' }],
}

const raceDetail = { id: 1, granted_skills: [{ id: 10, name: 'Скрытность' }] }
const backgroundDetail = { id: 2, granted_skills: [{ id: 11, name: 'Обман' }] }

const derived = { dieSides: 8, conMod: 1, hpLevel1: 9, avgGain: 6 }

const renderStep = (form, { classDetail: cd = classDetail, ...lookupsOverride } = {}, update = vi.fn()) =>
  render(
    <StepClass
      stepNo={3}
      total={7}
      form={{ class_id: '1', level: '1', subclass_id: '', class_skill_ids: [], ...form }}
      update={update}
      lookups={{ classes, classDetail: cd, subclassDetail: null, raceDetail, backgroundDetail, ...lookupsOverride }}
      derived={derived}
    />,
  )

const Harness = ({ initial = {}, onUpdate = vi.fn(), ...props } = {}) => {
  const [form, setForm] = useState({
    class_id: '1',
    level: '1',
    subclass_id: '',
    class_skill_ids: [],
    ...initial,
  })
  return (
    <StepClass
      stepNo={3}
      total={7}
      form={form}
      update={(patch) => {
        onUpdate(patch)
        setForm((f) => ({ ...f, ...patch }))
      }}
      lookups={{ classes, classDetail, subclassDetail: null, raceDetail, backgroundDetail }}
      derived={derived}
      {...props}
    />
  )
}

const section = (title) => {
  const el = screen.getByText(title)
  return el.closest('section')
}

describe('StepClass', () => {
  it('lists available classes', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /воин/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /волшебник/i })).toBeInTheDocument()
  })

  it('selecting a class clears subclass and skills', async () => {
    const update = vi.fn()
    renderStep({ subclass_id: '11', class_skill_ids: [1] }, {}, update)
    await userEvent.click(screen.getByRole('button', { name: /волшебник/i }))
    expect(update).toHaveBeenCalledWith({
      class_id: '2',
      subclass_id: '',
      class_skill_ids: [],
    })
  })

  it('does not render class or subclass features', () => {
    renderStep({ level: '3' })
    expect(screen.queryByText('Второе дыхание')).not.toBeInTheDocument()
    expect(screen.queryByText('Боевой дух')).not.toBeInTheDocument()
    expect(screen.queryByText('Дополнительная атака')).not.toBeInTheDocument()
  })

  it('summarizes spell slots available at the level', () => {
    renderStep({ level: '3' })
    expect(screen.getByText('Заговоры ур.: 2')).toBeInTheDocument()
    expect(screen.getByText('1 ур.: 2')).toBeInTheDocument()
    expect(screen.queryByText('2 ур.: 2')).not.toBeInTheDocument()
  })

  it('selects a subclass', async () => {
    const update = vi.fn()
    renderStep({}, {}, update)
    await userEvent.click(screen.getByRole('button', { name: /лезвие горы/i }))
    expect(update).toHaveBeenCalledWith({ subclass_id: '11' })
  })

  it('clears the subclass', async () => {
    const update = vi.fn()
    renderStep({ subclass_id: '11' }, {}, update)
    await userEvent.click(screen.getByRole('button', { name: /без подкласса/i }))
    expect(update).toHaveBeenCalledWith({ subclass_id: '' })
  })

  describe('Skills', () => {
    it('prompts to pick a class when none is selected', () => {
      renderStep({ class_id: '' }, { classDetail: null })
      expect(screen.getByText('Сначала выберите класс.')).toBeInTheDocument()
    })

    it('notes when the class has no skill choices', () => {
      renderStep({}, { classDetail: { ...classDetail, skill_choice_count: 0 } })
      expect(screen.getByText('У этого класса нет навыков на выбор.')).toBeInTheDocument()
    })

    it('shows the choice counter and grants from race and background', () => {
      renderStep({})
      expect(screen.getByText('Выбрано: 0 из 2')).toBeInTheDocument()
      expect(screen.getByText('Скрытность · раса')).toBeInTheDocument()
      expect(screen.getByText('Обман · предыстория')).toBeInTheDocument()
    })

    it('marks a skill as chosen and adds it to class_skill_ids', async () => {
      const update = vi.fn()
      renderStep({}, {}, update)
      await userEvent.click(screen.getByRole('button', { name: /атлетика/i }))
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ class_skill_ids: [1] }))
    })

    it('unmarks a chosen skill', async () => {
      const update = vi.fn()
      renderStep({ class_skill_ids: [1] }, {}, update)
      await userEvent.click(within(section('Навыки класса «Воин»')).getByRole('button', { name: /атлетика/i }))
      expect(update).toHaveBeenCalledWith({ class_skill_ids: [] })
    })

    it('prevents choosing more skills than the class allows', async () => {
      render(<Harness />)
      await userEvent.click(screen.getByRole('button', { name: /атлетика/i }))
      await userEvent.click(screen.getByRole('button', { name: /история/i }))
      const perception = within(section('Навыки класса «Воин»')).getByRole('button', { name: /восприятие/i })
      expect(perception).toBeDisabled()
      await userEvent.click(perception)
      expect(screen.getByText('Выбрано: 2 из 2')).toBeInTheDocument()
    })

    it('shows a hint when the skill limit is reached', () => {
      renderStep({ class_skill_ids: [1, 2] })
      expect(screen.getByText('Доступный лимит выбран.')).toBeInTheDocument()
    })

    it('renders class saving throws with full Russian names', () => {
      renderStep({})
      expect(screen.getByText('Спасбросок: Сила')).toBeInTheDocument()
      expect(screen.getByText('Спасбросок: Телосложение')).toBeInTheDocument()
      expect(screen.queryByText('STR')).not.toBeInTheDocument()
    })

    it('does not render a standalone saving throws section', () => {
      renderStep({})
      expect(screen.queryByText('Спасброски')).not.toBeInTheDocument()
    })
  })
})
