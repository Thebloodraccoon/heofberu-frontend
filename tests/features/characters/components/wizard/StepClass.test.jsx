import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  weapon_proficiencies: [{ weapon_category: 'MARTIAL' }],
  available_skills: [
    { id: 1, name: 'Атлетика', ability: 'STR' },
    { id: 2, name: 'История', ability: 'INT' },
    { id: 3, name: 'Восприятие', ability: 'WIS' },
  ],
  subclasses: [{ id: 11, name: 'Лезвие горы' }],
}

const raceDetail = { id: 1, granted_skills: [{ id: 10, name: 'Скрытность' }] }
const backgroundDetail = { id: 2, granted_skills: [{ id: 11, name: 'Обман' }] }

const derived = { dieSides: 8 }

const renderStep = (form, { classDetail: cd = classDetail, ...lookupsOverride } = {}, update = vi.fn()) =>
  render(
    <StepClass
      stepNo={4}
      total={7}
      form={{ class_id: '1', subclass_id: '', class_skill_ids: [], ...form }}
      update={update}
      lookups={{ classes, classDetail: cd, subclassDetail: null, raceDetail, backgroundDetail, ...lookupsOverride }}
      derived={derived}
    />,
  )

describe('StepClass', () => {
  it('lists available classes', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /воин/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /волшебник/i })).toBeInTheDocument()
  })

  it('shows saving throws, weapon and armor proficiencies as rows', () => {
    renderStep({})
    expect(screen.getByText('Спасброски:')).toBeInTheDocument()
    expect(screen.getByText('Сила, Телосложение')).toBeInTheDocument()
    expect(screen.getByText('Владения оружием:')).toBeInTheDocument()
    expect(screen.getByText('Воинское оружие')).toBeInTheDocument()
    expect(screen.queryByText('STR')).not.toBeInTheDocument()
  })

  it('renders a dash for classes without a spellcasting ability', () => {
    renderStep({})
    expect(screen.getByText('Характеристика заклинаний:')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('renders the spellcasting ability for a caster class', () => {
    renderStep({}, { classDetail: { ...classDetail, spellcasting_ability: 'CHA' } })
    expect(screen.getByText('Харизма')).toBeInTheDocument()
  })

  it('selecting a class clears subclass and skills', async () => {
    const update = vi.fn()
    renderStep({ subclass_id: '11', class_skill_ids: [1] }, {}, update)
    await userEvent.click(screen.getByRole('button', { name: /волшебник/i }))
    expect(update).toHaveBeenCalledWith({
      class_id: '2',
      subclass_id: '',
      class_skill_ids: [],
      starting_choices: {},
    })
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

  it('shows the subclass description and expands its features', async () => {
    renderStep({ subclass_id: '11' }, {
      classDetail: {
        ...classDetail,
        subclasses: [
          {
            id: 11,
            name: 'Лезвие горы',
            description: 'Мастер горного боя',
            features: [{ id: 55, name: 'Камнелом', description: 'Разбивает камень' }],
          },
        ],
      },
    })
    expect(screen.getByText('Мастер горного боя')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /камнелом/i }))
    expect(screen.getByText('Разбивает камень')).toBeInTheDocument()
  })
})
