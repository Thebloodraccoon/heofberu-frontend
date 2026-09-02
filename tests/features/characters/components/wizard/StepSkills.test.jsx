import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepSkills from '@/features/characters/components/wizard/StepSkills.jsx'

const classDetail = {
  id: 1,
  name: 'Воин',
  skill_choice_count: 2,
  available_skills: [
    { id: 1, name: 'Атлетика', ability: 'STR' },
    { id: 2, name: 'История', ability: 'INT' },
    { id: 3, name: 'Восприятие', ability: 'WIS' },
  ],
}

const raceDetail = { id: 1, granted_skills: [{ id: 10, name: 'Скрытность' }] }
const backgroundDetail = { id: 2, granted_skills: [{ id: 11, name: 'Обман' }] }

const renderStep = (form, { classDetail: cd = classDetail, ...lookupsOverride } = {}, update = vi.fn()) =>
  render(
    <StepSkills
      stepNo={5}
      total={7}
      form={{ class_id: '1', class_skill_ids: [], ...form }}
      update={update}
      lookups={{ classDetail: cd, raceDetail, backgroundDetail, ...lookupsOverride }}
    />,
  )

const Harness = ({ initial = {}, onUpdate = vi.fn() } = {}) => {
  const [form, setForm] = useState({
    class_id: '1',
    class_skill_ids: [],
    ...initial,
  })
  return (
    <StepSkills
      stepNo={5}
      total={7}
      form={form}
      update={(patch) => {
        onUpdate(patch)
        setForm((f) => ({ ...f, ...patch }))
      }}
      lookups={{ classDetail, raceDetail, backgroundDetail }}
    />
  )
}

describe('StepSkills', () => {
  it('prompts to pick a class when none is selected', () => {
    renderStep({ class_id: '' }, { classDetail: null })
    expect(screen.getAllByText('Сначала выберите класс.')[0]).toBeInTheDocument()
  })

  it('notes when the class has no skill choices', () => {
    renderStep({}, { classDetail: { ...classDetail, skill_choice_count: 0 } })
    expect(screen.getByText('У этого класса нет навыков на выбор.')).toBeInTheDocument()
  })

  it('shows the choice counter and grants from race and background', () => {
    renderStep({})
    expect(screen.getByText('Выбрано: 0 из 2')).toBeInTheDocument()
    expect(screen.getByText('Навыки уже получены на предыдущих этапах:')).toBeInTheDocument()
    expect(screen.getByText(/Скрытность/)).toBeInTheDocument()
    expect(screen.getByText(/Обман/)).toBeInTheDocument()
  })

  it('excludes skills already granted by race or background from the choice pool', () => {
    renderStep(
      {},
      {
        classDetail: {
          ...classDetail,
          available_skills: [...classDetail.available_skills, { id: 10, name: 'Скрытность', ability: 'DEX' }],
        },
      },
    )
    expect(screen.queryByRole('button', { name: /скрытность/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /атлетика/i })).toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('button', { name: /атлетика/i }))
    expect(update).toHaveBeenCalledWith({ class_skill_ids: [] })
  })

  it('prevents choosing more skills than the class allows', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: /атлетика/i }))
    await userEvent.click(screen.getByRole('button', { name: /история/i }))
    const perception = screen.getByRole('button', { name: /восприятие/i })
    expect(perception).toBeDisabled()
    await userEvent.click(perception)
    expect(screen.getByText('Выбрано: 2 из 2')).toBeInTheDocument()
  })
})