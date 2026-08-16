import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepReview from '@/features/characters/components/wizard/StepReview.jsx'

const lookups = {
  classes: [{ id: '1', name: 'Воин' }],
  races: [{ id: '1', name: 'Эльф' }],
  backgrounds: [{ id: '1', name: 'Благородный' }],
  feats: [{ id: '1', name: 'Внимательный' }],
  classDetail: {
    id: 1,
    name: 'Воин',
    saving_throws: [{ ability: 'STR' }, { ability: 'CON' }],
    available_skills: [{ id: 1, name: 'Атлетика' }],
    starting_items: [{ item_id: 1, quantity: 1, item: { name: 'Длинный меч' } }],
  },
  raceDetail: {
    id: 1,
    name: 'Эльф',
    granted_skills: [{ id: 10, name: 'Скрытность' }],
    subraces: [{ id: 2, name: 'Тёмный эльф' }],
  },
  backgroundDetail: {
    id: 1,
    name: 'Благородный',
    granted_skills: [],
    starting_items: [{ item_id: 2, quantity: 2, item: { name: 'Подарок' } }],
  },
}

const derived = {
  totals: { STR: 15, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
  bonusByCode: { STR: 2 },
  hpLevel1: 9,
  avgGain: 6,
  dieSides: 8,
  conMod: 1,
  expertiseBudget: 1,
}

const baseForm = {
  race_id: '1',
  subrace_id: '2',
  background_id: '1',
  class_id: '1',
  subclass_id: '',
  level: '3',
  hp_mode: 'average',
  rolled_dice: {},
  class_skill_ids: [1],
  expertise_ids: [],
  name: 'Аравель',
  feat_id: '1',
}

const renderStep = (form = {}, onRollHp = vi.fn(), lookupsOverride = {}) =>
  render(
    <StepReview
      stepNo={7}
      total={7}
      form={{ ...baseForm, ...form }}
      lookups={{ ...lookups, ...lookupsOverride }}
      derived={derived}
      onRollHp={onRollHp}
    />,
  )

describe('StepReview', () => {
  it('shows the name first and the chosen feat', () => {
    renderStep()
    const section = screen.getByText('Имя').closest('section')
    expect(section).toBeInTheDocument()
    expect(within(section).getByText('Аравель')).toBeInTheDocument()
    expect(within(section).getByText(/Внимательный/)).toBeInTheDocument()
  })

  it('resolves race, subrace, background and class names', () => {
    renderStep()
    expect(screen.getByText('Эльф')).toBeInTheDocument()
    expect(screen.getByText('Тёмный эльф')).toBeInTheDocument()
    expect(screen.getByText('Благородный')).toBeInTheDocument()
    expect(screen.getByText('Воин')).toBeInTheDocument()
  })

  it('shows a dash when a field is empty', () => {
    renderStep({ race_id: '', subrace_id: '', background_id: '', class_id: '', name: '' })
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('lists starting items from the class and background', () => {
    renderStep()
    expect(screen.getByText('Длинный меч')).toBeInTheDocument()
    expect(screen.getByText('Подарок ×2')).toBeInTheDocument()
  })

  it('shows the final HP for average mode', () => {
    renderStep()
    expect(screen.getAllByText('+6').length).toBeGreaterThan(0)
    expect(screen.getByText('Итоговое HP')).toBeInTheDocument()
    expect(screen.getByText('21')).toBeInTheDocument()
  })

  it('shows a roll button when roll-mode HP is missing', async () => {
    const onRollHp = vi.fn()
    renderStep({ hp_mode: 'roll', rolled_dice: {} }, onRollHp)
    expect(screen.getAllByText('?').length).toBe(2)
    expect(screen.getByText('Кости для уровней ещё не брошены.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Бросить кости' }))
    expect(onRollHp).toHaveBeenCalledTimes(1)
  })

  it('sums rolled HP when all rolls exist', () => {
    renderStep({ hp_mode: 'roll', rolled_dice: { 2: 5, 3: 4 } })
    expect(screen.getByText('+6')).toBeInTheDocument()
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('Итоговое HP')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('marks expertise with a star', () => {
    renderStep({ expertise_ids: [1] })
    expect(screen.getByText('Атлетика ★')).toBeInTheDocument()
  })

  it('shows an empty state when no skills are chosen', () => {
    renderStep({ class_skill_ids: [] }, vi.fn(), {
      raceDetail: { ...lookups.raceDetail, granted_skills: [] },
      backgroundDetail: { ...lookups.backgroundDetail, granted_skills: [] },
    })
    expect(screen.getByText('Навыки не выбраны')).toBeInTheDocument()
  })

  it('lists class saving throws in full Russian names', () => {
    renderStep()
    expect(screen.getByText('Сила, Телосложение')).toBeInTheDocument()
    expect(screen.queryByText('STR, CON')).not.toBeInTheDocument()
  })
})
