import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import { useLocation, useNavigate } from 'react-router-dom'
import { Leaf, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRoles } from '../../hooks/useRoles'
import { t } from '../../lib/i18n'
import { APP_ROUTES } from '../../routes'

const DRAWER_WIDTH = 240

const ROLE_LABELS: Record<string, string> = t.sidebar.roles
const USER_TYPE_LABELS: Record<string, string> = t.sidebar.userTypes

interface SidebarProps {
  onLogout: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  const { user } = useAuth()
  const { can } = useRoles()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#1a1d2e',
          color: '#fff',
          border: 'none',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Leaf size={24} color="#10b981" />
        <Typography variant="h6" fontWeight={700} color="#fff">{t.sidebar.brand}</Typography>
      </Box>

      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {APP_ROUTES.map((item) => {
          if (!can(item.permission)) return null
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 1,
                mb: 0.25,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                backgroundColor: isActive ? '#059669' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? '#047857' : 'rgba(255,255,255,0.07)',
                  color: '#fff',
                },
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
            label={(user?.role ? ROLE_LABELS[user.role] : USER_TYPE_LABELS[user?.user_type ?? '']) ?? ''}
            size="small"
            sx={{ mt: 0.25, height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
          />
        </Box>
        <IconButton onClick={onLogout} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#ef4444' } }} title={t.sidebar.logout}>
          <LogOut size={18} />
        </IconButton>
      </Box>
    </Drawer>
  )
}
