import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  BoxedValue,
  CheckDot,
  PassiveSenses,
  ProficiencyChips,
  RollButton,
  RollModal,
  SheetSectionLabel,
  SheetTabs,
  TextBlock,
  XpBar,
} from '@/components/sheet/primitives.jsx'
import { fmtBonus } from '@/lib/utils/sheet.js'

describe('fmtBonus', () => {
  it.each([
    [5, '+5'],
    [0, '0'],
    [-2, '-2'],
    [undefined, '0'],
    ['7', '+7'],
  ])('formats %s as %s', (input, expected) => {
    expect(fmtBonus(input)).toBe(expected)
  })
})

describe('RollButton', () => {
  it('renders the formatted bonus', () => {
    render(<RollButton bonus={3} />)
    expect(screen.getByRole('button', { name: '+3' })).toBeInTheDocument()
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(<RollButton bonus={1} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: '+1' }))
    expect(onClick).toHaveBeenCalled()
  })
})

describe('XpBar', () => {
  it('computes the fill percentage from current/next', () => {
    const { container } = render(<XpBar level={1} current={150} next={300} />)
    expect(container.querySelector('.sheet-xp__fill')).toHaveStyle({ width: '50%' })
  })

  it('caps the percentage at 100', () => {
    const { container } = render(<XpBar level={1} current={500} next={300} />)
    expect(container.querySelector('.sheet-xp__fill')).toHaveStyle({ width: '100%' })
  })

  it('returns 0% when next is not positive', () => {
    const { container } = render(<XpBar level={1} current={10} next={0} />)
    expect(container.querySelector('.sheet-xp__fill')).toHaveStyle({ width: '0%' })
  })

  it('prefers an explicit fill value', () => {
    const { container } = render(<XpBar level={1} current={1} next={2} fill={77} />)
    expect(container.querySelector('.sheet-xp__fill')).toHaveStyle({ width: '77%' })
  })

  it('clamps the next-level label at 20', () => {
    render(<XpBar level={19} />)
    expect(screen.getAllByText('20').length).toBeGreaterThan(0)
  })
})

describe('RollModal', () => {
  it('computes the total from d20 and bonus', () => {
    render(<RollModal d20={15} bonus={3} onClose={vi.fn()} />)
    expect(screen.getByText('18')).toBeInTheDocument()
  })

  it('shows the critical success message on a natural 20', () => {
    render(<RollModal d20={20} bonus={0} onClose={vi.fn()} />)
    expect(screen.getByText('Критический успех!')).toBeInTheDocument()
  })

  it('shows the critical failure message on a natural 1', () => {
    render(<RollModal d20={1} bonus={0} onClose={vi.fn()} />)
    expect(screen.getByText('Критический провал.')).toBeInTheDocument()
  })

  it('closes via the button', async () => {
    const onClose = vi.fn()
    render(<RollModal d20={10} bonus={0} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('uses the default title', () => {
    render(<RollModal d20={10} bonus={0} onClose={vi.fn()} />)
    expect(screen.getByText('Проверка')).toBeInTheDocument()
  })
})

describe('ProficiencyChips', () => {
  const options = [
    { value: 'STR', label: 'Сила' },
    { value: 'DEX', label: 'Ловкость' },
  ]

  it('renders the empty message when there are no options', () => {
    render(<ProficiencyChips items={[]} options={[]} empty="Ничего" />)
    expect(screen.getByText('Ничего')).toBeInTheDocument()
  })

  it('marks chips that are in items', () => {
    const { container } = render(<ProficiencyChips items={['STR']} options={options} />)
    expect(screen.getByText('Сила').closest('span')).toHaveClass('sheet-chip_on')
    expect(screen.getByText('Ловкость').closest('span')).not.toHaveClass('sheet-chip_on')
    void container
  })
})

describe('CheckDot', () => {
  it('reports the checked state', async () => {
    const onChange = vi.fn()
    render(<CheckDot onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('can be disabled', () => {
    render(<CheckDot disabled onChange={vi.fn()} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})

describe('SheetTabs', () => {
  it('renders tabs and highlights the active one', async () => {
    const onSelect = vi.fn()
    render(<SheetTabs tabs={[['main', 'Основное'], ['magic', 'Магия']]} active="magic" onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: 'Основное' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Магия' })).toHaveClass('sheet-tabs__btn_active')
    await userEvent.click(screen.getByRole('button', { name: 'Основное' }))
    expect(onSelect).toHaveBeenCalledWith('main')
  })
})

describe('TextBlock', () => {
  it('shows the value and starts editing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<TextBlock title="История" value="Текст" editing onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'История' }))
    expect(screen.getByText('Текст')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Новый текст')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(onSave).toHaveBeenCalledWith('Новый текст')
    expect(await screen.findByText('Сохранено')).toBeInTheDocument()
  })

  it('cancels editing and restores the original value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<TextBlock title="История" value="Исходный" editing onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: 'История' }))
    await userEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'Другое')
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.getByText('Исходный')).toBeInTheDocument()
  })

  it('renders an em dash for empty values', async () => {
    render(<TextBlock title="История" value="" />)
    await userEvent.click(screen.getByRole('button', { name: 'История' }))
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('PassiveSenses', () => {
  it('renders each sense', () => {
    render(<PassiveSenses items={[{ name: 'Восприятие', value: 15, icon: '👁' }]} />)
    expect(screen.getByText('Восприятие')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})

describe('BoxedValue / SheetSectionLabel', () => {
  it('renders a boxed value with label', () => {
    render(<BoxedValue label="КД">14</BoxedValue>)
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('КД')).toBeInTheDocument()
  })

  it('renders a section label', () => {
    render(<SheetSectionLabel>Навыки</SheetSectionLabel>)
    expect(screen.getByText('Навыки')).toBeInTheDocument()
  })
})
