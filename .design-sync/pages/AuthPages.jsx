// Design-sync reference wrappers around the real auth pages. These pages are
// already fully self-contained forms, so no mock composition is needed —
// just a router + auth context so useNavigate/useLocation/useAuth don't
// throw. Submit actions call the real login/register/authApi calls, which
// fail gracefully into the page's own inline ErrorBox when there's no
// backend (same as a real network error would).
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/features/auth/AuthContext.js'
import RealLoginPage from '@/features/auth/pages/LoginPage.jsx'
import RealRegisterPage from '@/features/auth/pages/RegisterPage.jsx'
import RealForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage.jsx'
import RealResetPasswordPage from '@/features/auth/pages/ResetPasswordPage.jsx'

const AUTH_VALUE = {
  login: async () => {
    throw new Error('Демо-страница: нет подключённого сервера')
  },
  register: async () => {
    throw new Error('Демо-страница: нет подключённого сервера')
  },
  busy: false,
  user: null,
  authenticated: false,
  isGM: false,
  isFounder: false,
  logout: () => {},
  loadUser: () => {},
}

const withProviders = (Page) =>
  function Wrapped({ initialEntries = ['/'], ...props }) {
    return (
      <AuthContext.Provider value={AUTH_VALUE}>
        <MemoryRouter initialEntries={initialEntries}>
          <Page {...props} />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

/** Login form — email/password, links to register and password recovery. */
export const LoginPage = withProviders(RealLoginPage)
/** Registration form — username/email/password with confirmation. */
export const RegisterPage = withProviders(RealRegisterPage)
/** "Forgot password" form — requests a recovery email by address. */
export const ForgotPasswordPage = withProviders(RealForgotPasswordPage)
/**
 * Set-new-password form, reached via a recovery link's `?token=` query
 * param. Pass `initialEntries={['/reset-password']}` (no token) to preview
 * the "invalid link" state instead.
 */
export const ResetPasswordPage = withProviders(RealResetPasswordPage)
