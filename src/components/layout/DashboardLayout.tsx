import { Suspense, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Loader } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import { t } from '../../lib/i18n'
import { APP_ROUTES } from '../../routes'

function PageLoader() {
  return (
    <Box role="status" aria-label={t.common.loading} sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <Loader />
    </Box>
  )
}

export default function DashboardLayout() {
  const { logout } = useAuth()
  const location = useLocation()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    // A single-page app never reloads, so nothing tells a screen reader that the page changed:
    // the tab title says where the user is, and focus moves to the new content (not on first load,
    // where the browser already starts at the top).
    const route = APP_ROUTES.find((r) => (r.path === '/' ? location.pathname === '/' : location.pathname.startsWith(r.path)))
    document.title = route ? `${route.label} · ${t.sidebar.brand} ${t.sidebar.subtitle}` : `${t.sidebar.brand} ${t.sidebar.subtitle}`
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [location.pathname])

  const handleLogout = () => {
    setShowConfirm(false)
    setShowToast(true)
    setTimeout(() => logout(), 1200)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      {/* First thing a keyboard user reaches: skip the menu instead of tabbing through every entry on each page. */}
      <Box
        component="a"
        href="#main-content"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault()
          mainRef.current?.focus()
        }}
        sx={{
          position: 'absolute',
          left: 8,
          top: -48,
          zIndex: 2000,
          px: 2,
          py: 1,
          borderRadius: 1,
          backgroundColor: '#fff',
          color: '#047857',
          fontWeight: 600,
          boxShadow: 3,
          '&:focus': { top: 8 },
        }}
      >
        {t.common.skipToContent}
      </Box>
      <Sidebar onLogout={() => setShowConfirm(true)} />

      <Box component="main" id="main-content" ref={mainRef} tabIndex={-1} sx={{ flex: 1, minWidth: 0, p: 3, outline: 'none' }}>
        {/* A crash in one page must not take down the menu; changing route clears it. */}
        <ErrorBoundary resetKeys={[location.pathname]}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Box>

      <Dialog open={showConfirm} onClose={() => setShowConfirm(false)} maxWidth="xs">
        <DialogTitle>{t.logout.confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">{t.logout.confirmMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowConfirm(false)}>{t.common.cancel}</Button>
          <Button variant="destructive" onClick={handleLogout}>{t.logout.confirmButton}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={showToast} onClose={() => setShowToast(false)} message={t.logout.successMessage} severity="success" />
    </Box>
  )
}
