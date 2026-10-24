import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, useNavigate, useSearchParams } from 'react-router-dom'
import PresetWorkspace from '@/features/campaigns/components/PresetWorkspace.jsx'
import PresetCreateForm from '@/features/campaigns/components/PresetCreateForm.jsx'
import PublicCampaignKnowledgePage from '@/features/campaigns/pages/PublicCampaignKnowledgePage.jsx'

const state = vi.hoisted(() => ({ preset: {}, auth: {}, save: vi.fn(), create: vi.fn(), transition: vi.fn(), push: vi.fn() }))
vi.mock('@/features/auth/useAuth.js', () => ({ useAuth: () => state.auth }))
vi.mock('@/components/ToastProvider.jsx', () => ({ useToasts: () => ({ push: state.push }) }))
vi.mock('@/components/ui/RichTextEditor.jsx', () => ({ default: ({ value, onChange, ariaLabel, disabled }) => <textarea aria-label={ariaLabel} value={value} onChange={onChange} disabled={disabled} /> }))
vi.mock('@/features/articles/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, subtypesApi: { ...actual.subtypesApi, list: async () => [] } }
})
vi.mock('@/features/campaigns/api.js', async (importOriginal) => ({
  ...await importOriginal(),
  publicCampaignsApi: {
    getBySlug: async () => state.preset,
    articles: { list: async () => [] },
    update: async (id, body) => {
      await state.save(body)
      state.preset = { ...state.preset, ...body, ...(body.tag_ids ? { tags: [] } : {}) }
      return state.preset
    },
    create: async (body) => { await state.create(body); state.preset = { ...state.preset, ...body }; return state.preset },
    publish: async () => { await state.transition('publish'); state.preset = { ...state.preset, status: 'published' }; return state.preset },
    archive: async () => { await state.transition('archive'); state.preset = { ...state.preset, status: 'archived' }; return state.preset },
    unpublish: async () => { await state.transition('unpublish'); state.preset = { ...state.preset, status: 'draft' }; return state.preset },
  },
  campaignMaterialsApi: { list: async () => ({ items: [], total: 0 }) },
}))

function EditorRoute() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  return params.get('slug') === 'new'
    ? <PresetCreateForm onSaved={(preset) => navigate(`?slug=${preset.slug}`)} onCancel={() => navigate('/done')} />
    : <PresetWorkspace slug={params.get('slug')} />
}
function setup(entry = '/gm/public-campaigns?slug=mayak') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter([
    { path: '/gm/public-campaigns', element: <EditorRoute /> },
    { path: '/public-campaigns/:slug/knowledge', element: <PublicCampaignKnowledgePage /> },
    { path: '*', element: <p>Другой экран</p> },
  ], { initialEntries: [entry] })
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
  return { user: userEvent.setup(), router }
}
async function edit(user) {
  await user.click(await screen.findByRole('button', { name: 'Изменить текст' }))
  return screen.getByRole('form', { name: 'Текст публичной кампании' })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  state.preset = { id: 9, slug: 'mayak', title: 'Проклятие маяка', pitch: 'Шторм.', description_markdown: 'Старый маяк.', author: { id: 5, username: 'Ария' }, status: 'draft', tags: [{ id: 3, name: 'море' }], campaign_count: 2 }
  state.auth = { user: { id: '5' }, isGM: true, isFounder: false }
  state.save.mockReset().mockResolvedValue({})
  state.create.mockReset().mockResolvedValue({})
  state.transition.mockReset().mockResolvedValue({})
})

describe('public campaign text editor', () => {
  it('shows the status, author and persistent navigation', async () => {
    setup()
    await screen.findByRole('button', { name: 'Изменить текст' })
    const nav = within(screen.getByRole('navigation', { name: 'Разделы публичной кампании' }))
    expect(nav.getByRole('link', { name: 'Текст' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'База знаний' })).toHaveAttribute('href', '/gm/public-campaigns?slug=mayak&tab=knowledge')
    expect(screen.getByText('@Ария')).toBeVisible()
    expect(screen.queryByText('Редактор кампании', { selector: '.lore-eyebrow' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Опубликовать' })).toBeVisible()
    expect(screen.queryByRole('menuitem', { name: 'В архив' })).not.toBeInTheDocument()
  })

  it('saves all text together and shows success without a toast', async () => {
    const { user } = setup()
    const form = await edit(user)
    await user.clear(within(form).getByRole('textbox', { name: 'Название кампании' }))
    await user.type(within(form).getByRole('textbox', { name: 'Название кампании' }), 'Новый маяк')
    fireEvent.change(within(form).getByRole('textbox', { name: 'Зазывалка' }), { target: { value: 'Первый абзац.\nВторой абзац.' } })
    fireEvent.change(within(form).getByRole('textbox', { name: 'Описание публичной кампании' }), { target: { value: 'Новая история.' } })
    expect(screen.getByRole('button', { name: 'Опубликовать' })).toBeDisabled()
    await user.click(within(form).getByRole('button', { name: 'Сохранить текст' }))
    await screen.findByText('Сохранено')
    expect(state.save).toHaveBeenCalledWith({ title: 'Новый маяк', pitch: 'Первый абзац.\nВторой абзац.', description_markdown: 'Новая история.' })
    expect(screen.getByRole('heading', { name: 'Новый маяк' })).toBeVisible()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(state.push).not.toHaveBeenCalled()
  })

  it('keeps the draft on failure and retries the same text', async () => {
    state.save.mockRejectedValueOnce(new Error('Сервер недоступен'))
    const { user } = setup()
    const form = await edit(user)
    await user.type(within(form).getByRole('textbox', { name: 'Зазывалка' }), ' Новая фраза.')
    await user.click(within(form).getByRole('button', { name: 'Сохранить текст' }))
    await screen.findByText('Сервер недоступен')
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveValue('Шторм. Новая фраза.')
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await screen.findByText('Сохранено')
    expect(state.save).toHaveBeenCalledTimes(2)
  })

  it('preserves unsaved text across internal tabs and guards leaving the workspace', async () => {
    const { user, router } = setup()
    const form = await edit(user)
    await user.type(within(form).getByRole('textbox', { name: 'Зазывалка' }), ' Правка.')
    await user.click(screen.getByRole('link', { name: 'База знаний' }))
    expect(router.state.location.pathname).toBe('/gm/public-campaigns')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await screen.findByRole('region', { name: 'Статьи базы знаний' })
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('link', { name: 'Текст', exact: true }))
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveValue('Шторм. Правка.')
    await user.click(screen.getByRole('link', { name: 'База знаний' }))
    fireEvent.click(screen.getByRole('link', { name: 'Текст', exact: true }))
    await act(() => router.navigate('/done'))
    await user.click(await screen.findByRole('button', { name: 'Остаться' }))
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveValue('Шторм. Правка.')
  })

  it('cancels editing without saving and allows navigation', async () => {
    const { user, router } = setup()
    const form = await edit(user)
    await user.type(within(form).getByRole('textbox', { name: 'Название кампании' }), ' Правка')
    await user.click(within(form).getByRole('button', { name: 'Отмена' }))
    expect(state.save).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Проклятие маяка' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'База знаний' }))
    expect(router.state.location.pathname).toBe('/gm/public-campaigns')
    expect(router.state.location.search).toContain('tab=knowledge')
  })

  it('uses the same length limits and rejects an empty title', async () => {
    const { user } = setup()
    const form = await edit(user)
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' }).tagName).toBe('TEXTAREA')
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveAttribute('maxlength', '500')
    expect(within(form).getByRole('textbox', { name: 'Название кампании' })).toHaveAttribute('maxlength', '200')
    await user.clear(within(form).getByRole('textbox', { name: 'Название кампании' }))
    expect(within(form).getByRole('button', { name: 'Сохранить текст' })).toBeDisabled()
  })

  it('saves tags immediately without sending text', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Удалить тег море' }))
    await screen.findByText('Сохранено')
    expect(state.save).toHaveBeenCalledWith({ tag_ids: [] })
    expect(screen.getByText('Тегов пока нет.')).toBeVisible()
  })

  it('publishes from the header and archives through the keyboard-accessible menu', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Опубликовать' }))
    await waitFor(() => expect(screen.getByText('Опубликована', { selector: '[data-tone="good"]' })).toBeVisible())
    const trigger = screen.getByRole('button', { name: 'Действия с кампанией' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Предпросмотр' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Снять с публикации' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'В архив' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'В архив' }))
    const confirm = within(screen.getByRole('dialog'))
    await user.click(confirm.getByRole('button', { name: 'В архив' }))
    await waitFor(() => expect(state.transition).toHaveBeenLastCalledWith('archive'))
  })

  it('marks another author’s campaign as view-only', async () => {
    state.auth = { user: { id: 77 }, isGM: true }
    const { user } = setup()
    await screen.findByText(/Просмотр: текст и параметры/)
    expect(screen.queryByRole('button', { name: 'Изменить текст' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Опубликовать' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Добавить теги' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Действия с кампанией' }))
    expect(screen.getByRole('menuitem', { name: 'Предпросмотр' })).toHaveAttribute('href', '/public-campaigns/mayak')
    expect(screen.queryByRole('menuitem', { name: 'В архив' })).not.toBeInTheDocument()
  })

  it('keeps preview available for archived campaigns', async () => {
    state.preset.status = 'archived'
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Действия с кампанией' }))
    expect(screen.getByRole('menuitem', { name: 'Предпросмотр' })).toHaveAttribute('href', '/public-campaigns/mayak')
    expect(screen.queryByRole('menuitem', { name: 'В архив' })).not.toBeInTheDocument()
  })

  it('warns before previewing unsaved text and keeps publication actions disabled', async () => {
    const { user } = setup()
    const form = await edit(user)
    await user.type(within(form).getByRole('textbox', { name: 'Зазывалка' }), ' Правка')
    await user.click(screen.getByRole('button', { name: 'Действия с кампанией' }))
    expect(screen.getByRole('menuitem', { name: 'В архив' })).toBeDisabled()
    await user.click(screen.getByRole('menuitem', { name: 'Предпросмотр' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Уйти без сохранения?')
    await user.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveValue('Шторм. Правка')
  })

  it('copies the full campaign URL without navigating', async () => {
    const { user, router } = setup()
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(await screen.findByRole('button', { name: 'Скопировать полную ссылку на кампанию' }))
    expect(copy).toHaveBeenCalledWith(`${window.location.origin}/public-campaigns/mayak`)
    expect(screen.getByText('Ссылка скопирована')).toBeVisible()
    expect(router.state.location.pathname).toBe('/gm/public-campaigns')
  })

  it('reports a clipboard failure without showing a success message', async () => {
    const { user } = setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Denied'))
    await user.click(await screen.findByRole('button', { name: 'Скопировать полную ссылку на кампанию' }))
    await waitFor(() => expect(state.push).toHaveBeenCalledWith('Не удалось скопировать ссылку', expect.any(String), 'error'))
    expect(screen.queryByText('Ссылка скопирована')).not.toBeInTheDocument()
  })

  it.each([['quest', 'Новый квест', 'Квест'], ['session', 'Новый план сессии', 'Сессия']])('opens the %s creation form inside the knowledge tab', async (type, heading, label) => {
    const { user, router } = setup('/gm/public-campaigns?slug=mayak&tab=knowledge')
    await user.click(await screen.findByRole('link', { name: heading }))
    expect(router.state.location.pathname).toBe('/gm/public-campaigns')
    expect(new URLSearchParams(router.state.location.search).get('article')).toBe('new')
    expect(new URLSearchParams(router.state.location.search).get('type')).toBe(type)
    expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: type === 'quest' ? 'Параметры квеста' : 'Параметры сессии' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Тип', exact: true })).toHaveTextContent(label)
    expect(screen.getByRole('button', { name: 'Тип', exact: true })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ })).toBeVisible()
    expect(screen.getAllByRole('button', { name: 'Отмена', exact: true })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ }))
    expect(new URLSearchParams(router.state.location.search).get('article')).toBeNull()
    expect(screen.getByRole('link', { name: heading })).toBeVisible()
  })

  it('opens an old session creation link in the internal knowledge tab', async () => {
    const { router } = setup('/public-campaigns/mayak/knowledge?article=new&type=session')
    await screen.findByRole('complementary', { name: 'Параметры сессии' })
    expect(router.state.location.pathname).toBe('/gm/public-campaigns')
    expect(new URLSearchParams(router.state.location.search).get('tab')).toBe('knowledge')
    expect(screen.getByRole('button', { name: 'Тип', exact: true })).toHaveTextContent('Сессия')
  })

  it('asks before returning from an unsaved material using the back button', async () => {
    const { user } = setup('/gm/public-campaigns?slug=mayak&tab=knowledge&article=new&type=quest')
    await user.type(await screen.findByRole('textbox', { name: 'Название', exact: true }), 'Черновик квеста')
    await user.click(screen.getByRole('button', { name: /Ко всем статьям базы знаний/ }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Уйти без сохранения?')
    await user.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(screen.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue('Черновик квеста')
  })

  it('keeps both a campaign draft and a new material across tab switches', async () => {
    const { user, router } = setup()
    const form = await edit(user)
    await user.type(within(form).getByRole('textbox', { name: 'Зазывалка' }), ' Правка.')
    await user.click(screen.getByRole('link', { name: 'База знаний' }))
    await user.click(await screen.findByRole('link', { name: 'Новый план сессии' }))
    await user.type(screen.getByRole('textbox', { name: 'Название', exact: true }), 'Сессия на острове')
    await user.click(screen.getByRole('link', { name: 'Текст', exact: true }))
    expect(within(form).getByRole('textbox', { name: 'Зазывалка' })).toHaveValue('Шторм. Правка.')
    await user.click(screen.getByRole('link', { name: 'База знаний' }))
    expect(screen.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue('Сессия на острове')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(() => router.navigate('/done'))
    await user.click(await screen.findByRole('button', { name: 'Остаться' }))
    expect(screen.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue('Сессия на острове')
  })

  it('keeps a text draft when opening and closing mobile settings', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    try {
      const { user } = setup()
      const form = await edit(user)
      await user.type(within(form).getByRole('textbox', { name: 'Название кампании' }), ' Правка')
      await user.click(screen.getByRole('button', { name: 'Параметры кампании' }))
      const drawer = within(screen.getByRole('dialog', { name: 'Параметры кампании' }))
      await user.click(drawer.getByRole('button', { name: 'Закрыть', exact: true }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(form).getByRole('textbox', { name: 'Название кампании' })).toHaveValue('Проклятие маяка Правка')
      expect(state.save).not.toHaveBeenCalled()
    } finally { media.mockRestore() }
  })
})

describe('new public campaign', () => {
  it('retains the entered text after a server failure', async () => {
    state.create.mockRejectedValueOnce(new Error('Создание недоступно'))
    const { user } = setup('/gm/public-campaigns?slug=new')
    await user.type(screen.getByRole('textbox', { name: 'Название кампании' }), 'Новая история')
    await user.click(screen.getByRole('button', { name: 'Создать черновик' }))
    await screen.findByText('Создание недоступно')
    expect(screen.getByRole('textbox', { name: 'Название кампании' })).toHaveValue('Новая история')
    expect(screen.getByRole('button', { name: 'Создать черновик' })).toBeEnabled()
  })
  it('guards cancellation and redirects after a successful save without a warning', async () => {
    const { user, router } = setup('/gm/public-campaigns?slug=new')
    await user.type(screen.getByRole('textbox', { name: 'Название кампании' }), 'Новая история')
    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    await user.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(screen.getByRole('textbox', { name: 'Название кампании' })).toHaveValue('Новая история')
    await user.click(screen.getByRole('button', { name: 'Создать черновик' }))
    await waitFor(() => expect(router.state.location.search).toBe('?slug=mayak'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Новая история' }))
  })
})
