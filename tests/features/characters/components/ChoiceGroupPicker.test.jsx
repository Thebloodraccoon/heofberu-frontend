import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { ChoiceGroupPicker } from '@/features/characters/components/ChoiceGroupPicker.jsx'

vi.mock('@/features/catalog/queries.js', () => ({
  useSkills: () => ({ data: [] }),
  useSpells: () => ({ data: [] }),
  useClasses: () => ({ data: [] }),
  useSpellsById: () => ({}),
  useItemNames: () => ({}),
  useSpellDetail: () => ({ data: null, isLoading: false }),
}))

const ALLOWED_SPELLS = [
  { id: 7, name: 'Огненный шар', level: 'LEVEL_3', school: 'EVOCATION', is_ritual: false },
  { id: 9, name: 'Молния', level: 'LEVEL_3', school: 'EVOCATION', is_ritual: false },
]

const openSpell = { id: 40, needs_spell: true, spell_effects: [{ spell_id: null }], allowed_spells: ALLOWED_SPELLS }
const concrete = { id: 50, needs_spell: false, spell_effects: [{ spell_id: 7 }] }

const groupWith = (options) => ({ id: 1, choice_type: 'SPELL', pick_count: 1, options })

const catalogs = {
  skillsCatalog: [],
  spellsById: { 7: ALLOWED_SPELLS[0] },
  names: { skillNames: {}, spellNames: { 7: 'Огненный шар' }, itemNames: {} },
}

// Держит список ответов в состоянии, как PendingChoicesModal.
function Harness({ group, initial = [], takenSpellIds, onSpy }) {
  const [list, setList] = useState(initial)
  return (
    <ChoiceGroupPicker
      group={group}
      list={list}
      onChange={(next) => {
        onSpy?.(next)
        setList(next)
      }}
      catalogs={catalogs}
      takenSpellIds={takenSpellIds}
    />
  )
}

describe('ChoiceGroupPicker', () => {
  it('renders each option as its own row', () => {
    renderWithProviders(<Harness group={groupWith([openSpell, concrete])} />)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    expect(screen.getByText('любое заклинание на выбор')).toBeInTheDocument()
    expect(screen.getByText('Огненный шар')).toBeInTheDocument()
  })

  it('offers the allowed spells for an open spell option and fills the entry on pick', async () => {
    const user = userEvent.setup()
    const onSpy = vi.fn()
    renderWithProviders(<Harness group={groupWith([openSpell])} onSpy={onSpy} />)

    await user.click(screen.getByRole('radio'))
    expect(onSpy).toHaveBeenLastCalledWith([expect.objectContaining({ choice_option_id: 40, spell_id: null })])
    // Список — не в группе, а в панели по кнопке.
    expect(screen.queryByPlaceholderText('Найти заклинание…')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Выбрать заклинание' }))
    expect(screen.getByPlaceholderText('Найти заклинание…')).toBeInTheDocument()

    await user.click(screen.getByText('Молния'))
    expect(onSpy).toHaveBeenLastCalledWith([expect.objectContaining({ choice_option_id: 40, spell_id: 9 })])
    expect(screen.queryByPlaceholderText('Найти заклинание…')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('does not offer spells already named in other groups', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Harness
        group={groupWith([openSpell])}
        initial={[{ key: 1, choice_option_id: 40, spell_id: null, skill_id: null }]}
        takenSpellIds={new Set([9])}
      />,
    )
    // Единственный вариант уже взят — отметки нет, выбирать нечего, кроме заклинания.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByText(/Выберите 1 вариант/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Выбрать заклинание' }))
    expect(screen.getByText('Огненный шар')).toBeInTheDocument()
    expect(screen.queryByText('Молния')).not.toBeInTheDocument()
  })

  it('opens the spell description without selecting a concrete spell option', async () => {
    const user = userEvent.setup()
    const onSpy = vi.fn()
    renderWithProviders(<Harness group={groupWith([concrete])} onSpy={onSpy} />)

    await user.click(screen.getByRole('button', { name: 'Подробнее: Огненный шар' }))
    expect(onSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('radio')).not.toBeChecked()
  })

  it('shows an option with several effects as separate plates', () => {
    const armor = { id: 60, armor_effects: [{ armor_type: 'LIGHT' }, { armor_type: 'MEDIUM' }] }
    renderWithProviders(<Harness group={{ id: 2, choice_type: 'ARMOR', pick_count: 1, options: [armor, concrete] }} />)
    expect(screen.getByText('Лёгкие доспехи')).toBeInTheDocument()
    expect(screen.getByText('Средние доспехи')).toBeInTheDocument()
  })

  it('picks an open ability with chips', async () => {
    const user = userEvent.setup()
    const onSpy = vi.fn()
    const anyAbility = { id: 70, needs_ability: true, ability_effects: [{ ability: null, amount: 2 }] }
    renderWithProviders(
      <Harness
        group={{ id: 3, choice_type: 'ABILITY_SCORE', pick_count: 1, options: [anyAbility] }}
        initial={[{ key: 5, choice_option_id: 70, ability: null }]}
        onSpy={onSpy}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Мудрость' }))
    expect(onSpy).toHaveBeenLastCalledWith([expect.objectContaining({ choice_option_id: 70, ability: 'WIS' })])
  })
})
