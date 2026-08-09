import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import ProtectedRoute, { GMRoute } from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import CharacterDetailPage from './pages/CharacterDetailPage.jsx'
import { CatalogListPage } from './pages/CatalogPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import GmEditorPage from './pages/GmEditorPage.jsx'

function RootRedirect() {
  const { authenticated } = useAuth()
  return authenticated ? <Navigate to="/characters" replace /> : <Navigate to="/" replace />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="catalog/:resource" element={<CatalogListPage />} />
            <Route path="catalog/:resource/:id" element={<CatalogListPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="characters" element={<CharactersPage />} />
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
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
