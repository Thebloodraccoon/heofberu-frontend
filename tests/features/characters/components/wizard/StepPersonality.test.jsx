import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StepPersonality from '@/features/characters/components/wizard/StepPersonality.jsx'

const feats = [
  { id: 1, name: 'Внимательный', prerequisite_ability: null, prerequisite_minimum_score: null },
  { id: 2, name: 'Воин', prerequisite_ability: 'STR', prerequisite_minimum_score: 13 },
]

const renderStep = (form = {}, update = vi.fn(), lookups = {}) =>
  render(
    <StepPersonality
      stepNo={6}
      total={7}
      form={{ name: '', feat_id: '', ...form }}
      update={update}
      lookups={{ feats, ...lookups }}
    />,
  )

const Harness = ({ initial = {}, onUpdate = vi.fn(), lookups = {} }) => {
  const [form, setForm] = useState({ name: '', feat_id: '', ...initial })
  return (
    <StepPersonality
      stepNo={6}
      total={7}
      form={form}
      update={(patch) => {
        onUpdate(patch)
        setForm((f) => ({ ...f, ...patch }))
      }}
      lookups={{ feats, ...lookups }}
    />
  )
}

describe('StepPersonality', () => {
  it('renders the name field and a feat list', () => {
    renderStep()
    expect(screen.getByPlaceholderText('Например, Аравель Тенелист')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /внимательный/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /воин/i })).toBeInTheDocument()
  })

  it('does not render personality details, money or image fields', () => {
    renderStep()
    for (const label of ['Особенности', 'Прочие владения', 'Предыстория (рассказ)', 'Заметки', 'Золото', 'Серебро', 'Медь', 'Изображение']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('updates the name field', async () => {
    const update = vi.fn()
    render(<Harness onUpdate={update} />)
    await userEvent.type(screen.getByPlaceholderText('Например, Аравель Тенелист'), 'Аравель')
    expect(update).toHaveBeenLastCalledWith({ name: 'Аравель' })
  })

  it('selects a feat and toggles it off', async () => {
    const update = vi.fn()
    render(<Harness onUpdate={update} />)
    await userEvent.click(screen.getByRole('button', { name: /внимательный/i }))
    expect(update).toHaveBeenLastCalledWith({ feat_id: '1' })
    await userEvent.click(screen.getByRole('button', { name: /внимательный/i }))
    expect(update).toHaveBeenLastCalledWith({ feat_id: '' })
  })

  it('shows a prerequisite tag on feats that require one', () => {
    renderStep()
    expect(screen.getByText('Нужно: Сила ≥ 13')).toBeInTheDocument()
  })

  it('filters the feat list by search', async () => {
    renderStep()
    await userEvent.type(screen.getByPlaceholderText('Поиск черты…'), 'вним')
    expect(screen.getByRole('button', { name: /внимательный/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /воин/i })).not.toBeInTheDocument()
  })

  it('hints when no feats are loaded', () => {
    renderStep({}, vi.fn(), { feats: [] })
    expect(screen.getByText('Черты ещё не загружены.')).toBeInTheDocument()
  })
})
