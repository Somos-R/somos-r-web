import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

/**
 * Full-screen background shared by every public screen (login, activation, reset...).
 * `wide` is for the screens that hold a long form, like the application to join Somos R.
 */
export function AuthShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: wide ? 720 : 400 }}>{children}</Box>
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
