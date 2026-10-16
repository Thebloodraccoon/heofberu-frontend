import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/queryKeys.js'
import {
  FULL_PAGE,
  campaignMaterialsApi,
  campaignsApi,
  characterVisibilityApi,
  publicCampaignsApi,
} from '@/features/campaigns/api.js'

const campaignKey = (id) => queryKeys.campaigns.detail(Number(id))

// --- игровые кампании ---------------------------------------------------------------------------------------

export const useCampaignsPage = (params) =>
  useQuery({ queryKey: queryKeys.campaigns.list(params), queryFn: () => campaignsApi.list(params), placeholderData: keepPreviousData })

export const useCampaign = (id) =>
  useQuery({ queryKey: campaignKey(id), queryFn: () => campaignsApi.get(Number(id)), enabled: !!id })

export const useSchedule = (params) =>
  useQuery({ queryKey: queryKeys.campaigns.schedule(params), queryFn: () => campaignsApi.schedule(params), placeholderData: keepPreviousData })

// Создание, правка, архив: меняются «мои кампании», а закрытие кампании ещё и освобождает персонажей
// (их листы перестают быть доступны ГМ) — поэтому заодно сбрасываем кеш персонажей.
const useCampaignMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.all })
      // Привязка к пресету меняет его счётчик столов.
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all })
    },
  })
}

export const useCreateCampaign = () => useCampaignMutation((body) => campaignsApi.create(body))
export const useUpdateCampaign = () => useCampaignMutation(({ id, ...body }) => campaignsApi.update(id, body))
export const useArchiveCampaign = () => useCampaignMutation((id) => campaignsApi.archive(id))
export const useRestoreCampaign = () => useCampaignMutation((id) => campaignsApi.restore(id))

// --- состав --------------------------------------------------------------------------------------------------

export const useRosterPage = (id, params) =>
  useQuery({
    queryKey: queryKeys.campaigns.roster(Number(id), params),
    queryFn: () => campaignsApi.roster.list(Number(id), params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

// Весь состав одной страницей — для отметки посещаемости.
export const useFullRoster = (id, options = {}) =>
  useQuery({
    queryKey: queryKeys.campaigns.roster(Number(id), { size: FULL_PAGE }),
    queryFn: () => campaignsApi.roster.list(Number(id), { size: FULL_PAGE }).then((page) => page?.items ?? []),
    enabled: !!id && options.enabled !== false,
  })

export const useCandidates = (id, params, options = {}) =>
  useQuery({
    queryKey: queryKeys.campaigns.candidates(Number(id), params),
    queryFn: () => campaignsApi.roster.candidates(Number(id), params),
    enabled: !!id && options.enabled !== false,
    placeholderData: keepPreviousData,
  })

const useRosterMutation = (id, mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: campaignKey(id) })
      // Состав решает, чьи листы ведёт ГМ: «Персонажи игроков» и сами листы надо перечитать.
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.all })
      // Состав — это и витрина персонажей на странице публичной кампании.
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all })
    },
  })
}

export const useAddToRoster = (id) => useRosterMutation(id, (characterId) => campaignsApi.roster.add(Number(id), characterId))
export const useSetRosterStatus = (id) =>
  useRosterMutation(id, ({ participationId, status }) => campaignsApi.roster.setStatus(Number(id), participationId, status))

// --- сессии --------------------------------------------------------------------------------------------------

export const useSessionsPage = (id, params) =>
  useQuery({
    queryKey: queryKeys.campaigns.sessions(Number(id), params),
    queryFn: () => campaignsApi.sessions.list(Number(id), params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

export const useSession = (id, sessionId) =>
  useQuery({
    queryKey: queryKeys.campaigns.session(Number(id), Number(sessionId)),
    queryFn: () => campaignsApi.sessions.get(Number(id), Number(sessionId)),
    enabled: !!id && !!sessionId,
  })

// Любая правка сессии меняет список, саму сессию и расписание (дата, статус, отмена).
const useSessionMutation = (id, mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...campaignKey(id), 'sessions'] })
      await queryClient.invalidateQueries({ queryKey: [...campaignKey(id), 'session'] })
      await queryClient.invalidateQueries({ queryKey: [...queryKeys.campaigns.all, 'schedule'] })
    },
  })
}

export const useSaveSession = (id) =>
  useSessionMutation(id, ({ sessionId, ...body }) =>
    sessionId ? campaignsApi.sessions.update(Number(id), sessionId, body) : campaignsApi.sessions.create(Number(id), body))
export const useDeleteSession = (id) => useSessionMutation(id, (sessionId) => campaignsApi.sessions.remove(Number(id), sessionId))
export const usePublishSession = (id) =>
  useSessionMutation(id, ({ sessionId, published }) =>
    published ? campaignsApi.sessions.publish(Number(id), sessionId) : campaignsApi.sessions.unpublish(Number(id), sessionId))
export const useSetAttendance = (id) =>
  useSessionMutation(id, ({ sessionId, participationIds }) => campaignsApi.sessions.setAttendance(Number(id), sessionId, participationIds))

// --- заметки ГМ ----------------------------------------------------------------------------------------------

export const useNotesPage = (id, params, options = {}) =>
  useQuery({
    queryKey: queryKeys.campaigns.notes(Number(id), params),
    queryFn: () => campaignsApi.notes.list(Number(id), params),
    enabled: !!id && options.enabled !== false,
    placeholderData: keepPreviousData,
  })

const useNoteMutation = (id, mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: [...campaignKey(id), 'notes'] }) })
}

export const useSaveNote = (id) =>
  useNoteMutation(id, ({ noteId, ...body }) =>
    noteId ? campaignsApi.notes.update(Number(id), noteId, body) : campaignsApi.notes.create(Number(id), body))
export const useDeleteNote = (id) => useNoteMutation(id, (noteId) => campaignsApi.notes.remove(Number(id), noteId))

// --- отзывы --------------------------------------------------------------------------------------------------

export const useReviewsPage = (id, params) =>
  useQuery({
    queryKey: queryKeys.campaigns.reviews(Number(id), params),
    queryFn: () => campaignsApi.reviews.list(Number(id), params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

export const useSessionReviewsPage = (id, sessionId, params, options = {}) =>
  useQuery({
    queryKey: queryKeys.campaigns.sessionReviews(Number(id), Number(sessionId), params),
    queryFn: () => campaignsApi.reviews.session.list(Number(id), Number(sessionId), params),
    enabled: !!id && !!sessionId && options.enabled !== false,
    placeholderData: keepPreviousData,
  })

// Отзыв о кампании виден и внутри неё, и на странице её публичной кампании.
const useReviewMutation = (id, mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...campaignKey(id), 'reviews'] })
      await queryClient.invalidateQueries({ queryKey: [...campaignKey(id), 'session'] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all })
    },
  })
}

export const useWriteReview = (id) => useReviewMutation(id, (body) => campaignsApi.reviews.write(Number(id), body))
export const useDeleteReview = (id) => useReviewMutation(id, () => campaignsApi.reviews.remove(Number(id)))
export const useModerateReview = (id) =>
  useReviewMutation(id, ({ reviewId, hidden }) => (hidden ? campaignsApi.reviews.hide(reviewId) : campaignsApi.reviews.unhide(reviewId)))
export const useWriteSessionReview = (id) =>
  useReviewMutation(id, ({ sessionId, ...body }) => campaignsApi.reviews.session.write(Number(id), sessionId, body))
export const useDeleteSessionReview = (id) =>
  useReviewMutation(id, (sessionId) => campaignsApi.reviews.session.remove(Number(id), sessionId))

// --- публичные кампании --------------------------------------------------------------------------------------

export const usePublicCampaignsPage = (params) =>
  useQuery({ queryKey: queryKeys.publicCampaigns.list(params), queryFn: () => publicCampaignsApi.list(params), placeholderData: keepPreviousData })

// Опубликованные пресеты для выбора «начать с публичной кампании» (плюс свои черновики ГМ).
export const usePresetOptions = (options = {}) =>
  useQuery({
    queryKey: queryKeys.publicCampaigns.list({ size: FULL_PAGE, status: ['published', 'draft'] }),
    queryFn: () => publicCampaignsApi.list({ size: FULL_PAGE, status: ['published', 'draft'] }).then((page) => page?.items ?? []),
    enabled: options.enabled !== false,
  })

export const usePublicCampaign = (slug) =>
  useQuery({ queryKey: queryKeys.publicCampaigns.bySlug(slug), queryFn: () => publicCampaignsApi.getBySlug(slug), enabled: !!slug })

export const usePublicCampaignCharacters = (id, params) =>
  useQuery({
    queryKey: queryKeys.publicCampaigns.characters(Number(id), params),
    queryFn: () => publicCampaignsApi.characters(Number(id), params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

export const usePublicCampaignReviews = (id, params) =>
  useQuery({
    queryKey: queryKeys.publicCampaigns.reviews(Number(id), params),
    queryFn: () => publicCampaignsApi.reviews(Number(id), params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  })

const usePublicCampaignMutation = (mutationFn) => {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all }) })
}

export const useSavePublicCampaign = () =>
  usePublicCampaignMutation(({ id, ...body }) => (id ? publicCampaignsApi.update(id, body) : publicCampaignsApi.create(body)))
export const useTransitionPublicCampaign = () =>
  usePublicCampaignMutation(({ id, action }) => publicCampaignsApi[action](id))
export const useReplacePublicCampaignArticles = () =>
  usePublicCampaignMutation(({ id, articles }) => publicCampaignsApi.articles.replace(id, articles))

// --- персонаж: публичность и карточка ------------------------------------------------------------------------

export const useCharacterCard = (id) =>
  useQuery({ queryKey: [...queryKeys.characters.detail(Number(id)), 'public'], queryFn: () => characterVisibilityApi.card(Number(id)), enabled: !!id })

export const useSetCharacterVisibility = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, visibility }) => characterVisibilityApi.set(id, visibility),
    // public_visibility — поле листа (CharacterResponse): лист, карточка и витрина пресетов перечитываются.
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(Number(id)) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.publicCampaigns.all })
    },
  })
}

// --- материалы кампаний (квесты и сессии в базе знаний) ------------------------------------------------------

export const useCampaignMaterials = (params, options = {}) =>
  useQuery({
    queryKey: queryKeys.campaignMaterials.list(params),
    queryFn: () => (params?.q ? campaignMaterialsApi.search(params) : campaignMaterialsApi.list(params)),
    enabled: options.enabled !== false,
    placeholderData: keepPreviousData,
  })
