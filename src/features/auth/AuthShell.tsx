import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

/** Full-screen background shared by every step of the sign-in. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #059669 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>{children}</Box>
    </Box>
  )
}

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
      <Typography variant="h6" component="h1" fontWeight={700} textAlign="center" mb={subtitle ? 1 : 3}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          {subtitle}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
    </Paper>
  )
}
