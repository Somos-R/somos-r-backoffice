import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useAuth } from './hooks/useAuth'
import { Button, Loader } from './components/ui'
import DashboardLayout from './components/layout/DashboardLayout'
import { RequirePermission } from './components/layout/RequirePermission'
import LoginPage from './features/auth/LoginPage'
import { t } from './lib/i18n'
import { APP_ROUTES } from './routes'

function NotFound() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}>
      <Box>
        <Typography variant="h4" component="h1" fontWeight={700}>{t.notFound.title}</Typography>
        <Typography color="text.secondary" mt={1}>{t.notFound.message}</Typography>
        <Link to="/">{t.notFound.backLink}</Link>
      </Box>
    </Box>
  )
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {children}
    </Box>
  )
}

export default function App() {
  const { isAuthenticated, isUserLoading, userError, retryUser, logout } = useAuth()

  // What the account may do comes from the server profile, so nothing renders before it arrives.
  if (isAuthenticated && isUserLoading) {
    return (
      <FullScreen>
        <Loader />
        <Typography variant="body2" color="text.secondary">{t.auth.session.loading}</Typography>
      </FullScreen>
    )
  }

  if (isAuthenticated && userError) {
    return (
      <FullScreen>
        <Typography>{t.auth.session.loadError}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => retryUser()}>{t.auth.session.retry}</Button>
          <Button variant="outlined" onClick={() => logout()}>{t.auth.session.logout}</Button>
        </Box>
      </FullScreen>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />

        {isAuthenticated ? (
          <Route element={<DashboardLayout />}>
            {APP_ROUTES.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <RequirePermission permission={route.permission} redirectIfDenied={route.path === '/'}>
                    {route.element}
                  </RequirePermission>
                }
              />
            ))}
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}
