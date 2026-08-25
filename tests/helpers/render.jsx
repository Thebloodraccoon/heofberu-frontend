import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider.jsx'

export function renderWithProviders(ui, {
  queryClient,
  auth = true,
  routerProps = { initialEntries: ['/'] },
  ...renderOptions
} = {}) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const wrapper = ({ children }) => {
    let tree = <MemoryRouter {...routerProps}>{children}</MemoryRouter>
    if (auth) {
      tree = <AuthProvider>{tree}</AuthProvider>
    }
    return <QueryClientProvider client={client}>{tree}</QueryClientProvider>
  }

  return { ...render(ui, { wrapper, ...renderOptions }), queryClient: client }
}
