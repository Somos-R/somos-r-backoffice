import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { QueryClientProvider } from '@tanstack/react-query'
import { theme } from './styles/theme'
import { queryClient } from './lib/queryClient'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ErrorScreen } from './components/layout/ErrorScreen'
import { NotificationHost } from './components/layout/NotificationHost'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary fallback={({ error, reset }) => <ErrorScreen fullScreen error={error} onRetry={reset} />}>
        <QueryClientProvider client={queryClient}>
          <App />
          <NotificationHost />
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
