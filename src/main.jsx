import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './styles/index.css'
import App from './app/App.jsx'
import { initTheme } from './lib/theme.js'
import { queryClient } from './lib/api/queryClient.js'

initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
