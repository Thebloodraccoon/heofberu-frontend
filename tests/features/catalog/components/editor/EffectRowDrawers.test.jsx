import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { ArmorClassEffectsEditor, SpeedEffectsEditor } from '@/features/catalog/components/editor/effectTypeEditors.jsx'

const formula = { id: 7, mode: 'FORMULA', value: 10, abilities: ['DEX'], allows_shield: true, condition: 'NONE', min_level: null }

describe('AC / speed effect rows edited in a side drawer', () => {
  it('shows each row as its summary with edit + delete; no inline form', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ArmorClassEffectsEditor rows={[formula]} onChange={onChange} />, { auth: false })
    expect(screen.getByText('КД = 10 + Ловкость')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Вид эффекта КД' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByTitle('Удалить'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('«Отмена» discards the drawer draft, «Готово» writes it back to the same row', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ArmorClassEffectsEditor rows={[formula]} onChange={onChange} />, { auth: false })
    await userEvent.click(screen.getByRole('button', { name: /Изменить: КД = 10/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Телосложение' }))
    await userEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /Изменить: КД = 10/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Телосложение' }))
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }))
    expect(onChange).toHaveBeenCalledWith([{ ...formula, abilities: ['DEX', 'CON'] }])
  })

  it('«+ Скорость» adds a new row only on «Готово»', async () => {
    const onChange = vi.fn()
    renderWithProviders(<SpeedEffectsEditor rows={[]} onChange={onChange} />, { auth: false })
    await userEvent.click(screen.getByRole('button', { name: 'Добавить: Скорость' }))
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }))
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ speed_type: 'WALK', mode: 'BONUS', value: 10 })])
  })

  it('the list has no form controls: fields and mode chips live only in the drawer', () => {
    const speed = { id: 3, speed_type: 'WALK', mode: 'BONUS', value: 10, condition: 'WEARING_ARMOR', min_level: 5 }
    const { container } = renderWithProviders(
      <>
        <ArmorClassEffectsEditor rows={[formula, { id: 8, mode: 'BONUS', value: 1, condition: 'WEARING_ARMOR' }]} onChange={vi.fn()} />
        <SpeedEffectsEditor rows={[speed]} onChange={vi.fn()} />
      </>,
      { auth: false },
    )
    expect(container.querySelectorAll('input, select, textarea, [aria-haspopup="listbox"]')).toHaveLength(0)
    expect(screen.queryByText('Прибавка к КД')).not.toBeInTheDocument()
    expect(screen.queryByText('Когда действует')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Вид эффекта КД' })).not.toBeInTheDocument()
    // Название секции слева, «+» справа — в одной строке.
    expect(screen.getByText('Класс доспеха')).toBeInTheDocument()
    expect(screen.getAllByText('Скорость')[0]).toBeInTheDocument()
  })
})

describe('static AC/speed effects inside the feature effects editor screen', () => {
  it('EffectGroupModal (static, armor class) lists compact rows without inline fields', async () => {
    const { default: EffectGroupModal } = await import('@/features/catalog/components/editor/EffectGroupModal.jsx')
    const { container } = renderWithProviders(
      <EffectGroupModal
        inline
        mode="static"
        effectType="armor_class_effects"
        availableTypes={[]}
        initialRows={[{ id: 1, mode: 'BONUS', value: 1, condition: 'WEARING_ARMOR', min_level: null }]}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
      { auth: false },
    )
    expect(screen.getByText('КД +1 (в доспехе)')).toBeInTheDocument()
    expect(container.querySelectorAll('input, select, textarea, [aria-haspopup="listbox"]')).toHaveLength(0)
  })
})
