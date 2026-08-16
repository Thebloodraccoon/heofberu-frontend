import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorBox,
  Modal,
  PillToggle,
  Select,
  StatTable,
  humanize,
} from '@/components/ui/index.js'

describe('humanize', () => {
  it('returns an em dash for empty values', () => {
    expect(humanize(null)).toBe('—')
    expect(humanize(undefined)).toBe('—')
    expect(humanize('')).toBe('—')
  })

  it('localizes booleans', () => {
    expect(humanize(true)).toBe('Да')
    expect(humanize(false)).toBe('Нет')
  })

  it('title-cases snake case strings', () => {
    expect(humanize('skill_choice_count')).toBe('Skill Choice Count')
  })

  it('passes through numbers', () => {
    expect(humanize(42)).toBe('42')
  })
})

describe('Select', () => {
  const options = (
    <>
      <option value="A">Альфа</option>
      <option value="B">Бета</option>
      <option value="C">Гамма</option>
    </>
  )

  it('shows the selected label', () => {
    render(<Select value="B" onChange={vi.fn()}>{options}</Select>)
    expect(screen.getByRole('button', { name: 'Бета' })).toBeInTheDocument()
  })

  it('shows the placeholder when nothing is selected', () => {
    render(<Select value="" onChange={vi.fn()} placeholder="Выберите класс">{options}</Select>)
    expect(screen.getByRole('button', { name: 'Выберите класс' })).toBeInTheDocument()
  })

  it('opens on click and reports the chosen option', async () => {
    const onChange = vi.fn()
    render(<Select value="A" onChange={onChange}>{options}</Select>)
    await userEvent.click(screen.getByRole('button', { name: 'Альфа' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Гамма' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: 'C' } })
  })

  it('supports keyboard navigation', async () => {
    const onChange = vi.fn()
    render(<Select value="A" onChange={onChange}>{options}</Select>)
    const trigger = screen.getByRole('button', { name: 'Альфа' })
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith({ target: { value: 'B' } })
  })

  it('skips disabled options while navigating', async () => {
    const onChange = vi.fn()
    render(
      <Select value="A" onChange={onChange}>
        <option value="A">Альфа</option>
        <option value="B" disabled>Бета</option>
        <option value="C">Гамма</option>
      </Select>,
    )
    const trigger = screen.getByRole('button', { name: 'Альфа' })
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith({ target: { value: 'C' } })
  })

  it('closes on Escape and on outside click', async () => {
    render(<Select value="A" onChange={vi.fn()}>{options}</Select>)
    const trigger = screen.getByRole('button', { name: 'Альфа' })
    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await userEvent.click(trigger)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports optgroup children', async () => {
    const onChange = vi.fn()
    render(
      <Select value="X" onChange={onChange}>
        <optgroup label="Группа">
          <option value="X">Икс</option>
          <option value="Y">Игрек</option>
        </optgroup>
      </Select>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Икс' }))
    await userEvent.click(screen.getByRole('option', { name: 'Игрек' }))
    expect(onChange).toHaveBeenCalledWith({ target: { value: 'Y' } })
  })

  it('renders an empty-options message', async () => {
    render(<Select value="" onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Выберите...' }))
    expect(screen.getByText('Нет вариантов')).toBeInTheDocument()
  })
})

describe('Modal', () => {
  it('renders title, subtitle and children', () => {
    render(
      <Modal title="Удалить" subtitle="Действие необратимо" onClose={vi.fn()}>
        <p>Содержимое</p>
      </Modal>,
    )
    expect(screen.getByText('Удалить')).toBeInTheDocument()
    expect(screen.getByText('Действие необратимо')).toBeInTheDocument()
    expect(screen.getByText('Содержимое')).toBeInTheDocument()
  })

  it('falls back to the md size for unknown sizes', () => {
    const { container } = render(<Modal title="T" size="weird">x</Modal>)
    expect(container.querySelector('.max-w-md')).toBeInTheDocument()
  })

  it('closes on overlay click but not on panel click', async () => {
    const onClose = vi.fn()
    const { container } = render(<Modal title="T" onClose={onClose}>x</Modal>)
    await userEvent.click(screen.getByText('T'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })

  it('closes via the close button', async () => {
    const onClose = vi.fn()
    render(<Modal title="T" onClose={onClose}>x</Modal>)
    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ConfirmDialog', () => {
  it('renders the message and confirm text', () => {
    render(<ConfirmDialog title="Удалить" message="Точно?" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText('Точно?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Да, удалить' })).toBeInTheDocument()
  })

  it('disables buttons while busy and shows busy text', () => {
    render(<ConfirmDialog busy message="x" onCancel={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Удаляем...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled()
  })

  it('shows the error box when an error is present', () => {
    render(
      <ConfirmDialog message="x" error={{ message: 'Не получилось' }} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    )
    expect(screen.getByText('Не получилось')).toBeInTheDocument()
  })

  it('fires onConfirm and onCancel', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmDialog message="x" onCancel={onCancel} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Да, удалить' }))
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ErrorBox', () => {
  it('renders the error message', () => {
    render(<ErrorBox error={new Error('boom')} />)
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('renders string errors', () => {
    render(<ErrorBox error="plain" />)
    expect(screen.getByText('plain')).toBeInTheDocument()
  })

  it('fires the retry callback', async () => {
    const onRetry = vi.fn()
    render(<ErrorBox error="x" onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('PillToggle', () => {
  const options = [
    { value: 'A', label: 'Альфа' },
    { value: 'B', label: 'Бета' },
  ]

  it('marks selected pills and toggles them', async () => {
    const onToggle = vi.fn()
    const { container } = render(<PillToggle options={options} selected={['A']} onToggle={onToggle} />)
    const active = screen.getByRole('button', { name: 'Альфа' })
    expect(active).toHaveClass('bg-ember')
    expect(screen.getByRole('button', { name: 'Бета' })).not.toHaveClass('bg-ember')
    await userEvent.click(active)
    expect(onToggle).toHaveBeenCalledWith('A')
    void container
  })
})

describe('Badge', () => {
  it.each(['default', 'accent', 'good', 'bad'])('renders a %s tone badge', (tone) => {
    render(<Badge tone={tone}>текст</Badge>)
    expect(screen.getByText('текст')).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('renders with the primary variant by default', () => {
    const { container } = render(<Button>Жми</Button>)
    expect(container.firstChild).toHaveClass('bg-ember')
  })
})

describe('StatTable', () => {
  it('renders rows for key/value pairs', () => {
    render(<StatTable rows={[['Класс', 'Воин'], ['Уровень', 5]]} />)
    expect(screen.getByText('Класс')).toBeInTheDocument()
    expect(screen.getByText('Воин')).toBeInTheDocument()
    expect(screen.getByText('Уровень')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders nothing for empty rows', () => {
    const { container } = render(<StatTable rows={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
