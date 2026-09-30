import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRoles } from '../../hooks/useRoles'
import { t } from '../../lib/i18n'
import { APP_ROUTES } from '../../routes'

const DRAWER_WIDTH = 240

const ROLE_LABELS: Record<string, string> = t.sidebar.roles

interface SidebarProps {
  onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  const { user } = useAuth()
  const { can } = useRoles()
  const location = useLocation()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', backgroundColor: '#0f172a', color: '#fff', border: 'none' },
      }}
    >
      <Box component="aside" aria-label={t.sidebar.label} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <ShieldCheck size={24} color="#10b981" />
          <Box>
            {/* The brand is a name, not a section title: keeping it out of the heading outline. */}
            <Typography variant="h6" component="p" fontWeight={700} color="#fff" lineHeight={1.2}>{t.sidebar.brand}</Typography>
            <Typography variant="caption" component="p" color="rgba(255,255,255,0.7)">{t.sidebar.subtitle}</Typography>
          </Box>
        </Box>

        <List component="nav" aria-label={t.sidebar.navigation} sx={{ flex: 1, px: 1, py: 1 }}>
          {APP_ROUTES.map((item) => {
            if (!can(item.permission)) return null
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            return (
              <ListItemButton
                key={item.path}
                // A real link: keyboard, middle click and screen readers get "link" and the current page.
                component={RouterLink}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  borderRadius: 1,
                  mb: 0.25,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive ? '#059669' : 'transparent',
                  '&:hover': { backgroundColor: isActive ? '#047857' : 'rgba(255,255,255,0.07)', color: '#fff' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
              </ListItemButton>
            )
          })}
        </List>

        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} color="#fff" noWrap>
              {user?.full_name ?? t.sidebar.defaultUser}
            </Typography>
            <Chip
              label={(user?.role_code && ROLE_LABELS[user.role_code]) || user?.role_code || ''}
              size="small"
              sx={{ mt: 0.25, height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
            />
          </Box>
          <IconButton onClick={onLogout} sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ef4444' } }} title={t.sidebar.logout} aria-label={t.sidebar.logout}>
            <LogOut size={18} />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  )
}
