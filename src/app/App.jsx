import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider.jsx'
import { useAuth } from '@/features/auth/useAuth.js'
import ProtectedRoute, { GMRoute } from '@/features/auth/ProtectedRoute.jsx'
import Layout from '@/components/layout/Layout.jsx'
import { Spinner } from '@/components/ui'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage.jsx'))
const LandingPage = lazy(() => import('@/features/landing/pages/LandingPage.jsx'))
const CharactersPage = lazy(() => import('@/features/characters/pages/CharactersPage.jsx'))
const CharacterCreatePage = lazy(() => import('@/features/characters/pages/CharacterCreatePage.jsx'))
const CharacterDetailPage = lazy(() => import('@/features/characters/pages/CharacterDetailPage.jsx'))
const GmCharactersPage = lazy(() => import('@/features/characters/pages/GmCharactersPage.jsx'))
const CatalogListPage = lazy(() => import('@/features/catalog/pages/CatalogPage.jsx'))
const UsersPage = lazy(() => import('@/features/users/pages/UsersPage.jsx'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage.jsx'))
const GmEditorPage = lazy(() => import('@/features/catalog/pages/GmEditorPage.jsx'))
const GuidePage = lazy(() => import('@/features/guide/pages/GuidePage.jsx'))

function RootRedirect() {
  const { authenticated } = useAuth()
  return authenticated ? <Navigate to="/characters" replace /> : <Navigate to="/" replace />
}

function PageFallback() {
  return <Spinner label="Загружаем страницу..." />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="guide" element={<GuidePage />} />
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
                    <GMRoute>
                      <UsersPage />
                    </GMRoute>
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
