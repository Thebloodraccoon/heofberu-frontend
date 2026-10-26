import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import EffectsSummary from '@/features/catalog/components/editor/EffectsSummary.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'

const HTML =
  '<p>Вы получаете:</p><ul><li>Скорость: ходьба +60 фт.</li></ul>\n\n' +
  '<p>У вас есть выбор:</p><ul><li>Навыки: любой</li></ul>'

describe('EffectsSummary part preview', () => {
  it('shows the static part with its «Вы получаете:» intro, as in the description', () => {
    renderWithProviders(<EffectsSummary html={HTML} part="static" />)

    expect(screen.getByText('Вы получаете:')).toBeInTheDocument()
    expect(screen.getByText('Скорость: ходьба +60 фт.')).toBeInTheDocument()
    expect(screen.queryByText('У вас есть выбор:')).not.toBeInTheDocument()
  })

  it('shows the choice part with its «У вас есть выбор:» intro', () => {
    renderWithProviders(<EffectsSummary html={HTML} part="choice" />)

    expect(screen.getByText('У вас есть выбор:')).toBeInTheDocument()
    expect(screen.getByText('Навыки: любой')).toBeInTheDocument()
    expect(screen.queryByText('Вы получаете:')).not.toBeInTheDocument()
  })

  it('renders nothing when the part is empty', () => {
    const { container } = renderWithProviders(<EffectsSummary html="" part="static" />)

    expect(container).toBeEmptyDOMElement()
  })
})
