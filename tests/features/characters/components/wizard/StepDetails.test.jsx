import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepDetails from '@/features/characters/components/wizard/StepDetails.jsx'

const emptyForm = {
  name: '',
  image_path: '',
  traits: '',
  proficiencies: '',
  backstory: '',
  notes: '',
  money_gold: 0,
  money_silver: 0,
  money_copper: 0,
}

const renderStep = (form = {}) =>
  render(
    <StepDetails
      stepNo={5}
      total={6}
      form={{ ...emptyForm, ...form }}
      update={vi.fn()}
    />,
  )

const Harness = ({ initial = {}, onUpdate = vi.fn() }) => {
  const [form, setForm] = useState({ ...emptyForm, ...initial })
  return (
    <StepDetails
      stepNo={5}
      total={6}
      form={form}
      update={(patch) => {
        onUpdate(patch)
        setForm((f) => ({ ...f, ...patch }))
      }}
    />
  )
}

describe('StepDetails', () => {
  it('renders all detail fields', () => {
    renderStep()
    expect(screen.getByPlaceholderText('Например, Аравель Тенелист')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('/images/hero.jpg')).toBeInTheDocument()
    for (const label of ['Особенности', 'Прочие владения', 'Предыстория (рассказ)', 'Заметки', 'Золото', 'Серебро', 'Медь']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('updates the name field', async () => {
    const update = vi.fn()
    render(<Harness onUpdate={update} />)
    await userEvent.type(screen.getByPlaceholderText('Например, Аравель Тенелист'), 'Аравель')
    expect(update).toHaveBeenCalledWith({ name: 'Аравель' })
  })

  it('updates backstory textarea', async () => {
    const update = vi.fn()
    render(<Harness onUpdate={update} />)
    await userEvent.type(screen.getByLabelText('Предыстория (рассказ)'), 'История героя')
    expect(update).toHaveBeenCalledWith({ backstory: 'История героя' })
  })

  it('renders money fields with defaults', () => {
    renderStep()
    expect(screen.getAllByDisplayValue('0')).toHaveLength(3)
  })
})
