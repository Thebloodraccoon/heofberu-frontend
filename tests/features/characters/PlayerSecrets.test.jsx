import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PersonalityPanel from '@/features/characters/components/sheet/PersonalityPanel.jsx'

const CHARACTER = {
  personality_traits: 'Вырос среди контрабандистов.\n:::gm\nСдал свою команду страже.\n:::\nТеперь ищет искупления.',
  ideals: 'Свобода.', bonds: '', flaws: '',
}

describe('player secrets in the character sheet', () => {
  it('frames the hidden part as visible only to the player and the GM', () => {
    render(<PersonalityPanel character={CHARACTER} onSave={() => vi.fn()} />)
    const secret = screen.getByText('Только для игрока и мастера').closest('aside')
    expect(within(secret).getByText('Сдал свою команду страже.')).toBeVisible()
    expect(screen.getByText('Вырос среди контрабандистов.')).toBeVisible()
    expect(screen.getByText('Теперь ищет искупления.')).toBeVisible()
  })

  it('offers the secret block button and explains it while editing', async () => {
    const user = userEvent.setup()
    render(<PersonalityPanel character={CHARACTER} onSave={() => vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: 'Изменить' })[0])
    expect(screen.getByTitle('Только для игрока и мастера: блок не попадёт в публичную карточку')).toBeInTheDocument()
    expect(screen.getByText(/не видны в публичной карточке героя/)).toBeVisible()
  })
})
