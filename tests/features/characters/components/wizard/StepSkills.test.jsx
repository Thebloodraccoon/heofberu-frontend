import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepSkills from '@/features/characters/components/wizard/StepSkills.jsx'

const klass = {
  id: 1,
  name: 'Воин',
  skill_choice_count: 2,
  saving_throws: [{ ability: 'STR' }],
  available_skills: [
    { id: 1, name: 'Атлетика', ability: 'STR' },
    { id: 2, name: 'История', ability: 'INT' },
    { id: 3, name: 'Восприятие', ability: 'WIS' },
  ],
}

const raceDetail = { id: 1, granted_skills: [{ id: 10, name: 'Скрытность' }] }
const backgroundDetail = { id: 2, granted_skills: [{ id: 11, name: 'Обман' }] }

const renderStep = (form, { expertiseBudget = 2, classDetail = klass, race = raceDetail, bg = backgroundDetail } = {}, update = vi.fn()) =>
  render(
    <StepSkills
      stepNo={4}
      total={6}
      form={{ class_skill_ids: [], expertise_ids: [], ...form }}
      update={update}
      lookups={{ classDetail, raceDetail: race, backgroundDetail: bg }}
      derived={{ expertiseBudget }}
    />,
  )

const panel = (title) => {
  const el = screen.getByText(title)
  return el.closest('.rounded-lg')
}

describe('StepSkills', () => {
  it('prompts to pick a class when none is selected', () => {
    renderStep({}, { classDetail: null })
    expect(screen.getByText('Сначала выберите класс.')).toBeInTheDocument()
  })

  it('notes when the class has no skill choices', () => {
    renderStep({}, { classDetail: { ...klass, skill_choice_count: 0 } })
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
    await userEvent.click(within(panel('Навыки класса «Воин»')).getByRole('button', { name: /атлетика/i }))
    expect(update).toHaveBeenCalledWith({ class_skill_ids: [] })
  })

  it('strips expertise from a skill when it is added as a choice', async () => {
    const update = vi.fn()
    renderStep({ class_skill_ids: [1], expertise_ids: [1, 2] }, {}, update)
    await userEvent.click(screen.getByRole('button', { name: /история/i }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ class_skill_ids: [1, 2], expertise_ids: [1] }),
    )
  })

  it('adds expertise within the budget', async () => {
    const update = vi.fn()
    renderStep({ class_skill_ids: [1, 2], expertise_ids: [1] }, {}, update)
    await userEvent.click(within(panel('Экспертиза')).getByRole('button', { name: /история/i }))
    expect(update).toHaveBeenCalledWith({ expertise_ids: [1, 2] })
  })

  it('removes expertise on a second click', async () => {
    const update = vi.fn()
    renderStep({ class_skill_ids: [1, 2], expertise_ids: [1, 2] }, {}, update)
    await userEvent.click(within(panel('Экспертиза')).getByRole('button', { name: /история/i }))
    expect(update).toHaveBeenCalledWith({ expertise_ids: [1] })
  })

  it('disables expertise selection once the budget is reached', () => {
    renderStep({ class_skill_ids: [1, 2, 3], expertise_ids: [1, 2] })
    const perception = within(panel('Экспертиза')).getByRole('button', { name: /восприятие/i })
    expect(perception).toBeDisabled()
  })

  it('hides the expertise panel when the budget is zero', () => {
    renderStep({}, { expertiseBudget: 0 })
    expect(screen.queryByText('Экспертиза')).not.toBeInTheDocument()
  })

  it('renders class saving throws', () => {
    renderStep({})
    expect(within(panel('Спасброски')).getByText('STR')).toBeInTheDocument()
  })
})
