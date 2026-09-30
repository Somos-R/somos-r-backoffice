import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './styles/theme'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { ErrorScreen } from './components/layout/ErrorScreen'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary fallback={({ error, reset }) => <ErrorScreen fullScreen error={error} onRetry={reset} />}>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
