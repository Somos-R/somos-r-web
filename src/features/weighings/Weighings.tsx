import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MuiTextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import WeighingsTable, { type Weighing } from './WeighingsTable'
import RegisterWeighingDrawer from './RegisterWeighingDrawer'
import { Card, CardContent, Button } from '../../components/ui'
import { t } from '../../lib/i18n'
import { weighingsService, type WeighingAPI } from '../../services/weighings'

function toViewModel(w: WeighingAPI): Weighing {
  return {
    id: w.id,
    fecha: w.fecha,
    reciclador_nombre: w.recycler.full_name,
    material: w.material_code as Weighing['material'],
    kg: Number(w.kg),
    precio_kg: Number(w.precio_kg),
    estado: w.estado,
    rejection_reason: w.rejection_reason,
  }
}

interface StatCardProps { label: string; value: string; sub: string; color?: string }

function StatCard({ label, value, sub, color = 'text.primary' }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Weighings() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['weighings'],
    queryFn: () => weighingsService.list({ limit: 50 }),
  })

  const { data: stats } = useQuery({
    queryKey: ['weighings', 'stats'],
    queryFn: () => weighingsService.stats(),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'validado' | 'rechazado' | 'pagado'; reason?: string }) =>
      weighingsService.updateStatus(id, { status, rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighings'] })
    },
    onSettled: () => {
      setActionLoadingId(null)
    },
  })

  const handleValidate = (id: string) => {
    setActionLoadingId(id)
    statusMutation.mutate({ id, status: 'validado' })
  }

  const handleOpenReject = (id: string) => {
    setRejectTargetId(id)
    setRejectReason('')
    setRejectReasonError('')
    setRejectDialogOpen(true)
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectReasonError('El motivo de rechazo es requerido')
      return
    }
    if (!rejectTargetId) return
    setRejectDialogOpen(false)
    setActionLoadingId(rejectTargetId)
    statusMutation.mutate({ id: rejectTargetId, status: 'rechazado', reason: rejectReason.trim() })
  }

  const handleMarkPaid = (id: string) => {
    setActionLoadingId(id)
    statusMutation.mutate({ id, status: 'pagado' })
  }

  const items = (listData?.items ?? []).map(toViewModel)
  const totalKgMonth = stats ? Number(stats.total_kg_month).toLocaleString('es-CO') : '0'
  const totalWeighingsMonth = stats?.total_weighings_month ?? 0
  const pendingCount = stats?.pending_count ?? 0

  if (listLoading && items.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>{t.pesajes.title}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{t.pesajes.subtitle}</Typography>
        </Box>
        <Button onClick={() => setDrawerOpen(true)}>Nuevo pesaje</Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <StatCard
            label="Pesajes este mes"
            value={String(totalWeighingsMonth)}
            sub="pesajes registrados"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            label="Kg recogidos este mes"
            value={`${totalKgMonth} kg`}
            sub="total del período"
            color="success.dark"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            label="Pendientes de validar"
            value={String(pendingCount)}
            sub="requieren acción"
            color={pendingCount > 0 ? 'warning.main' : 'text.disabled'}
          />
        </Grid>
      </Grid>

      <WeighingsTable
        data={items}
        isLoading={listLoading}
        onValidate={handleValidate}
        onReject={handleOpenReject}
        onMarkPaid={handleMarkPaid}
        actionLoadingId={actionLoadingId}
      />

      <RegisterWeighingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Rechazar pesaje</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Motivo de rechazo"
            placeholder="Describe el motivo por el cual se rechaza este pesaje..."
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError('') }}
            error={!!rejectReasonError}
            helperText={rejectReasonError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={handleConfirmReject}>Confirmar rechazo</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
