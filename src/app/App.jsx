import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Route, RouterProvider, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import ProtectedRoute, { FounderRoute, GMRoute } from '@/features/auth/ProtectedRoute.jsx'
import Layout from '@/components/layout/Layout.jsx'
import { ToastProvider } from '@/components/ToastProvider.jsx'
import { ErrorBoundary, Skeleton, SkeletonCard } from '@/components/ui'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage.jsx'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage.jsx'))
const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage.jsx'))
const CharactersPage = lazy(() => import('@/features/characters/pages/CharactersPage.jsx'))
const CharacterCreatePage = lazy(() => import('@/features/characters/pages/CharacterCreatePage.jsx'))
const CharacterDetailPage = lazy(() => import('@/features/characters/pages/CharacterDetailPage.jsx'))
const GmCharactersPage = lazy(() => import('@/features/characters/pages/GmCharactersPage.jsx'))
const CatalogListPage = lazy(() => import('@/features/catalog/pages/CatalogPage.jsx'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage.jsx'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage.jsx'))
const GmEditorPage = lazy(() => import('@/features/catalog/pages/GmEditorPage.jsx'))
const GmArticlesPage = lazy(() => import('@/features/articles/pages/GmArticlesPage.jsx'))
const LoreLayout = lazy(() => import('@/features/articles/pages/LoreLayout.jsx'))
const LorePage = lazy(() => import('@/features/articles/pages/LorePage.jsx'))
const ArticleDetailPage = lazy(() => import('@/features/articles/pages/ArticleDetailPage.jsx'))
const GuidePage = lazy(() => import('@/features/guide/pages/GuidePage.jsx'))

function RootRedirect() {
  const { authenticated } = useAuth()
  return authenticated ? <Navigate to="/characters" replace /> : <Navigate to="/" replace />
}

function PageFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  )
}

function RouteBoundary({ children }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
  )
}

// Маршруты остаются декларативными <Routes>, но живут под data-router: без него не работает
// useBlocker (защита несохранённых правок, UnsavedGuard). Один catch-all маршрут — вся таблица ниже.
function AppRoutes() {
  return (
    <RouteBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route index element={<LandingPage />} />
            <Route path="guide" element={<GuidePage />} />
            <Route path="lore" element={<LoreLayout />}>
              <Route index element={<LorePage />} />
              <Route path=":slug" element={<ArticleDetailPage />} />
            </Route>
            <Route path="catalog/:resource" element={<CatalogListPage />} />
            <Route path="catalog/:resource/:id" element={<CatalogListPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="characters" element={<CharactersPage />} />
              <Route path="characters/new" element={<CharacterCreatePage />} />
              <Route path="characters/:id" element={<CharacterDetailPage />} />
              <Route
                path="users"
                element={
                  <FounderRoute>
                    <UsersPage />
                  </FounderRoute>
                }
              />
              <Route
                path="gm/editor"
                element={
                  <GMRoute>
                    <GmEditorPage />
                  </GMRoute>
                }
              />
              <Route
                path="gm/articles"
                element={
                  <GMRoute>
                    <GmArticlesPage />
                  </GMRoute>
                }
              />
              <Route
                path="gm/characters"
                element={
                  <GMRoute>
                    <GmCharactersPage />
                  </GMRoute>
                }
              />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </Suspense>
    </RouteBoundary>
  )
}

const router = createBrowserRouter([{ path: '*', element: <AppRoutes /> }])

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
