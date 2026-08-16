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

const derived = { dieSides: 8, conMod: 1, hpLevel1: 9, avgGain: 6 }

const renderStep = (form, update = vi.fn()) =>
  render(
    <StepClass
      stepNo={2}
      total={6}
      form={{ class_id: '1', level: '1', hp_mode: 'average', manual_hp: {}, ...form }}
      update={update}
      lookups={{ classes, classDetail, subclassDetail: null }}
      derived={derived}
    />,
  )

describe('StepClass', () => {
  it('lists available classes', () => {
    renderStep({})
    expect(screen.getByRole('button', { name: /воин/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /волшебник/i })).toBeInTheDocument()
  })

  it('selecting a class clears the subclass', async () => {
    const update = vi.fn()
    renderStep({ subclass_id: '11' }, update)
    await userEvent.click(screen.getByRole('button', { name: /волшебник/i }))
    expect(update).toHaveBeenCalledWith({ class_id: '2', subclass_id: '' })
  })

  it('changes the level through the select', async () => {
    const update = vi.fn()
    renderStep({}, update)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('option', { name: '5' }))
    expect(update).toHaveBeenCalledWith({ level: '5' })
  })

  it('only renders features unlocked at the current level', () => {
    renderStep({ level: '3' })
    expect(screen.getByText('Второе дыхание')).toBeInTheDocument()
    expect(screen.getByText('Боевой дух')).toBeInTheDocument()
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
    renderStep({}, update)
    await userEvent.click(screen.getByRole('button', { name: /лезвие горы/i }))
    expect(update).toHaveBeenCalledWith({ subclass_id: '11' })
  })

  it('clears the subclass', async () => {
    const update = vi.fn()
    renderStep({ subclass_id: '11' }, update)
    await userEvent.click(screen.getByRole('button', { name: /без подкласса/i }))
    expect(update).toHaveBeenCalledWith({ subclass_id: '' })
  })

  describe('HP modes', () => {
    it('switches to average mode', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'roll' }, update)
      await userEvent.click(screen.getByRole('button', { name: /среднее/i }))
      expect(update).toHaveBeenCalledWith({ hp_mode: 'average' })
    })

    it('switches to manual and backfills missing gains with the average', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'average', level: '3', manual_hp: {} }, update)
      await userEvent.click(screen.getByRole('button', { name: /вручную/i }))
      expect(update).toHaveBeenCalledWith({ hp_mode: 'manual', manual_hp: { 2: 6, 3: 6 } })
    })

    it('keeps existing manual gains when switching to manual', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'average', level: '3', manual_hp: { 2: 5 } }, update)
      await userEvent.click(screen.getByRole('button', { name: /вручную/i }))
      expect(update).toHaveBeenCalledWith({ hp_mode: 'manual', manual_hp: { 2: 5, 3: 6 } })
    })

    it('clamps a manual gain input to [1, dieSides + conMod]', async () => {
      const update = vi.fn()
      renderStep({ hp_mode: 'manual', level: '3', manual_hp: {} }, update)
      const levelTwo = screen.getByText('Уровень 2').closest('label')
      const input = within(levelTwo).getByDisplayValue('6')
      await userEvent.clear(input)
      await userEvent.type(input, '99')
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ manual_hp: expect.objectContaining({ 2: 9 }) }),
      )
    })
  })

  it('shows starting HP for level 1', () => {
    renderStep({})
    expect(
      screen.getByText((_, node) => node?.textContent === 'Уровень 1: к8 + 1 = 9 HP'),
    ).toBeInTheDocument()
  })
})
