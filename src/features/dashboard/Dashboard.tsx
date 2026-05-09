import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import { Users, Scale, ClipboardList, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, Badge, Button } from '../../components/ui'
import { useAuthStore } from '../../hooks/useAuth'

const METRICS = [
  { label: 'Recicladores activos', value: '12', trend: '+2 este mes', up: true, icon: <Users size={22} color="#059669" /> },
  { label: 'Pesajes este mes', value: '47', trend: '+8 vs anterior', up: true, icon: <Scale size={22} color="#059669" /> },
  { label: 'Solicitudes pendientes', value: '3', trend: '−1 vs ayer', up: false, icon: <ClipboardList size={22} color="#f59e0b" /> },
  { label: 'Kg recolectados', value: '1.284', trend: '+124 kg', up: true, icon: <Package size={22} color="#059669" /> },
]

const RECENT_PESAJES = [
  { reciclador: 'Carlos Mendez', material: 'Papel', kg: 32, fecha: '2026-04-18' },
  { reciclador: 'María López', material: 'Plástico', kg: 15, fecha: '2026-04-17' },
  { reciclador: 'Juan Torres', material: 'Metal', kg: 8, fecha: '2026-04-17' },
  { reciclador: 'Ana Gómez', material: 'Cartón', kg: 45, fecha: '2026-04-16' },
  { reciclador: 'Pedro Ruiz', material: 'Vidrio', kg: 20, fecha: '2026-04-15' },
]

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>Bienvenido, {user?.full_name ?? 'Admin'}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>Panel de control — Portal ECA</Typography>
      </Box>

      <Grid container spacing={2}>
        {METRICS.map((m) => (
          <Grid item xs={12} sm={6} lg={3} key={m.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  {m.icon}
                  <Badge
                    label={m.trend}
                    color={m.up ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Typography variant="h4" fontWeight={700}>{m.value}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>{m.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardHeader
          title="Pesajes recientes"
          action={
            <Button variant="text" size="small" onClick={() => window.location.href = '/pesajes'}>
              Ver todos →
            </Button>
          }
        />
        <List disablePadding>
          {RECENT_PESAJES.map((p, i) => (
            <Box key={i}>
              {i > 0 && <Divider />}
              <ListItem sx={{ px: 2, py: 1.25 }}>
                <ListItemText
                  primary={p.reciclador}
                  secondary={p.material}
                  primaryTypographyProps={{ fontWeight: 500, variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={500}>{p.kg} kg</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </Typography>
                </Box>
              </ListItem>
            </Box>
          ))}
        </List>
      </Card>
    </Box>
  )
}
