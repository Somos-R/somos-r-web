import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import { Users, Scale, ClipboardList, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, Badge, Button } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { t, interpolate } from '../../lib/i18n'
import { weighingsService } from '../../services/weighings'
import { recyclersService } from '../../services/recyclers'

export default function Dashboard() {
  const { user } = useAuth()

  const { data: weighingStats } = useQuery({
    queryKey: ['weighings', 'stats'],
    queryFn: ({ signal }) => weighingsService.stats({ signal }),
  })

  // Counts come from the server's `total` (limit 1 = no rows shipped): filtering a page of 100
  // in the browser stops being true as soon as there are more recyclers than that.
  const { data: verifiedRecyclers } = useQuery({
    queryKey: ['recyclers', 'count', 'verified'],
    queryFn: ({ signal }) => recyclersService.list({ verification_status: 'verified', limit: 1 }, { signal }),
  })

  const { data: pendingRecyclersData } = useQuery({
    queryKey: ['recyclers', 'count', 'pending'],
    queryFn: ({ signal }) => recyclersService.list({ verification_status: 'pending', limit: 1 }, { signal }),
  })

  const { data: recentWeighings, isLoading: recentLoading } = useQuery({
    queryKey: ['weighings', 'recent'],
    queryFn: ({ signal }) => weighingsService.list({ limit: 5 }, { signal }),
  })

  const activeRecyclers = verifiedRecyclers?.total ?? 0
  const pendingRecyclers = pendingRecyclersData?.total ?? 0
  const totalWeighings = weighingStats?.total_weighings_month ?? 0
  const pendingWeighings = weighingStats?.pending_count ?? 0
  const collectedKg = weighingStats ? Number(weighingStats.total_kg_month) : 0

  const metrics = [
    {
      label: t.dashboard.metrics.activeRecyclers,
      value: String(activeRecyclers),
      trend: pendingRecyclers > 0 ? interpolate(t.dashboard.trends.pendingRecyclers, { count: pendingRecyclers }) : t.dashboard.trends.noPending,
      up: pendingRecyclers === 0,
      icon: <Users size={22} color="#059669" />,
    },
    {
      label: t.dashboard.metrics.monthlyWeighings,
      value: String(totalWeighings),
      trend: t.dashboard.trends.thisMonth,
      up: totalWeighings > 0,
      icon: <Scale size={22} color="#059669" />,
    },
    {
      label: t.dashboard.metrics.pendingRequests,
      value: String(pendingWeighings),
      trend: t.dashboard.trends.toValidate,
      up: pendingWeighings === 0,
      icon: <ClipboardList size={22} color={pendingWeighings > 0 ? '#f59e0b' : '#059669'} />,
    },
    {
      label: t.dashboard.metrics.collectedKg,
      value: collectedKg.toLocaleString('es-CO'),
      trend: t.dashboard.trends.kgThisMonth,
      up: collectedKg > 0,
      icon: <Package size={22} color="#059669" />,
    },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" fontWeight={600}>
          {interpolate(t.dashboard.greeting, { name: user?.full_name ?? t.sidebar.defaultUser })}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.dashboard.subtitle}</Typography>
      </Box>

      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid item xs={12} sm={6} lg={3} key={m.label}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  {m.icon}
                  <Badge label={m.trend} color={m.up ? 'success' : 'error'} size="small" />
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
          title={t.dashboard.recentWeighings}
          action={
            <Button variant="text" size="small" onClick={() => window.location.href = '/pesajes'}>
              {t.dashboard.viewAll}
            </Button>
          }
        />
        {recentLoading ? (
          <Box sx={{ px: 2, py: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} height={48} sx={{ my: 0.5 }} />
            ))}
          </Box>
        ) : (
          <List disablePadding>
            {(recentWeighings?.items ?? []).map((w, i) => (
              <Box key={w.id}>
                {i > 0 && <Divider />}
                <ListItem sx={{ px: 2, py: 1.25 }}>
                  <ListItemText
                    primary={w.recycler.full_name}
                    secondary={w.material.label}
                    primaryTypographyProps={{ fontWeight: 500, variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight={500}>{Number(w.kg).toLocaleString('es-CO')} kg</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(w.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </Typography>
                  </Box>
                </ListItem>
              </Box>
            ))}
            {(recentWeighings?.items ?? []).length === 0 && (
              <ListItem sx={{ px: 2, py: 2 }}>
                <ListItemText
                  primary={t.dashboard.noWeighings}
                  primaryTypographyProps={{ variant: 'body2', color: 'text.secondary', textAlign: 'center' }}
                />
              </ListItem>
            )}
          </List>
        )}
      </Card>
    </Box>
  )
}
