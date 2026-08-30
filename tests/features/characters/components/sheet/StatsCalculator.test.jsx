import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import StatsCalculator from '@/features/characters/components/sheet/StatsCalculator.jsx'
import { renderWithProviders } from '@tests/helpers/render.jsx'
import { useCharacterStats } from '@/features/characters/queries.js'

vi.mock('@/features/characters/queries.js', () => ({
  useCharacterStats: vi.fn(() => ({ data: null })),
}))

const STATS_DATA = {
  strength: {
    base: 15,
    total: 29,
    contributions: [
      { label: 'Level 4 (ASI)', amount: 2, source: 'ASI_LOG' },
      { label: 'Level 8 (ASI)', amount: 2, source: 'ASI_LOG' },
      { label: 'GM adjustment', amount: 10, source: 'GM' },
    ],
  },
  dexterity: { base: 10, total: 10, contributions: [] },
  constitution: {
    base: 14,
    total: 17,
    contributions: [
      { label: 'Level 4 (ASI)', amount: 2, source: 'ASI_LOG' },
      { label: 'Racial', amount: 1, name: 'Резерв' },
    ],
  },
  intelligence: { base: 8, total: 8, contributions: [] },
  wisdom: { base: 12, total: 12, contributions: [] },
  charisma: { base: 10, total: 13, contributions: [{ source: 'GM', value: 3 }] },
}

// Итог и чипы рендерятся разными текстовыми узлами (<b>, смежные комментарии),
// поэтому сравниваем полный textContent элемента. При этом исключаем контейнеры,
// чей текст целиком собран из дочерних элементов.
const byText = (str) => (_, el) => {
  if (!el) return false
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text !== str) return false
  if (!el.childNodes || el.childNodes.length === 0) return true
  return Array.from(el.childNodes).some(
    (n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '',
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StatsCalculator', () => {
  it('renders base → total and contribution chips per statistic', () => {
    useCharacterStats.mockReturnValue({ data: STATS_DATA })
    renderWithProviders(<StatsCalculator characterId={7} />)

    expect(screen.getByText('Расчёт характеристик')).toBeInTheDocument()
    expect(screen.getByText('Сила')).toBeInTheDocument()
    expect(screen.getByText(byText('15 → 29'))).toBeInTheDocument()
  })

  it('translates English contribution labels and groups level choices as "Повышения"', () => {
    useCharacterStats.mockReturnValue({ data: STATS_DATA })
    renderWithProviders(<StatsCalculator characterId={7} />)

    expect(screen.getByText(byText('Правки ГМ +10'))).toBeInTheDocument()
    expect(screen.getByText(byText('Раса +1'))).toBeInTheDocument()
    expect(screen.getAllByText(byText('Повышения +2')).length).toBeGreaterThanOrEqual(1)
  })

  it('shows a placeholder when a statistic has no bonuses', () => {
    useCharacterStats.mockReturnValue({ data: STATS_DATA })
    renderWithProviders(<StatsCalculator characterId={7} />)

    expect(screen.getByText('Ловкость')).toBeInTheDocument()
    expect(screen.getByText(byText('10 → 10'))).toBeInTheDocument()
    expect(screen.getAllByText('Без бонусов').length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to a human-readable name when the backend omits labels', () => {
    useCharacterStats.mockReturnValue({
      data: {
        ...STATS_DATA,
        wisdom: { base: 12, total: 15, contributions: [{ source_type: 'FEATURE', amount: 3 }] },
      },
    })
    renderWithProviders(<StatsCalculator characterId={7} />)

    expect(screen.getByText(byText('Особенность +3'))).toBeInTheDocument()
  })
})