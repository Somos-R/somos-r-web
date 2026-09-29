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
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import WeighingsTable, { type Weighing } from './WeighingsTable'
import RegisterWeighingDrawer from './RegisterWeighingDrawer'
import { Card, CardContent, Button } from '../../components/ui'
import { t } from '../../lib/i18n'
import { weighingsService, type WeighingAPI, type WeighingStatus, type WeighingStatusTransition } from '../../services/weighings'
import { inventoryService } from '../../services/inventory'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { useRoles } from '../../hooks/useRoles'

function toViewModel(w: WeighingAPI): Weighing {
  return {
    id: w.id,
    occurred_at: w.occurred_at,
    reciclador_nombre: w.recycler.full_name,
    material: { code: w.material_code, label: w.material.label },
    kg: Number(w.kg),
    price_per_kg: Number(w.price_per_kg),
    status: w.status,
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
  const { can } = useRoles()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [status, setStatus] = useState<WeighingStatus | ''>('')
  const [materialCode, setMaterialCode] = useState('')
  const pagination = usePagination()

  // The server filters and paginates; the previous page stays on screen while the next loads.
  const { data: listData, isLoading: listLoading, isFetching: listFetching } = useQuery({
    queryKey: ['weighings', 'list', { status, materialCode, page: pagination.page, rowsPerPage: pagination.rowsPerPage }],
    queryFn: ({ signal }) =>
      weighingsService.list(
        { status: status || undefined, material_code: materialCode || undefined, limit: pagination.limit, offset: pagination.offset },
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
  pagination.clamp(listData?.total)

  const { data: materials = [] } = useQuery({
    queryKey: ['inventory', 'materials'],
    queryFn: ({ signal }) => inventoryService.materials({ signal }),
    staleTime: 10 * 60_000, // the catalog barely changes
  })

  const { data: stats } = useQuery({
    queryKey: ['weighings', 'stats'],
    queryFn: ({ signal }) => weighingsService.stats({ signal }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: WeighingStatusTransition; reason?: string }) =>
      weighingsService.updateStatus(id, { status, rejection_reason: reason }),
    // On a conflict (already validated by someone else, recycler no longer verified...) the
    // global handler shows the server's message and this reloads the row.
    meta: { refreshOnError: [['weighings']] },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weighings'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onSettled: () => {
      setActionLoadingId(null)
    },
  })

  const handleValidate = (id: string) => {
    setActionLoadingId(id)
    statusMutation.mutate({ id, status: 'validated' })
  }

  const handleOpenReject = (id: string) => {
    setRejectTargetId(id)
    setRejectReason('')
    setRejectReasonError('')
    setRejectDialogOpen(true)
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectReasonError(t.pesajes.rejectDialog.reasonRequired)
      return
    }
    if (!rejectTargetId) return
    setRejectDialogOpen(false)
    setActionLoadingId(rejectTargetId)
    statusMutation.mutate({ id: rejectTargetId, status: 'rejected', reason: rejectReason.trim() })
  }

  const handleMarkPaid = (id: string) => {
    setActionLoadingId(id)
    statusMutation.mutate({ id, status: 'paid' })
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
        {can('weighings.create') && <Button onClick={() => setDrawerOpen(true)}>{t.pesajes.newWeighing}</Button>}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <StatCard
            label={t.pesajes.stats.monthly}
            value={String(totalWeighingsMonth)}
            sub={t.pesajes.stats.monthlySub}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            label={t.pesajes.stats.monthlyKg}
            value={`${totalKgMonth} kg`}
            sub={t.pesajes.stats.monthlyKgSub}
            color="success.dark"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard
            label={t.pesajes.stats.pendingValidation}
            value={String(pendingCount)}
            sub={t.pesajes.stats.pendingValidationSub}
            color={pendingCount > 0 ? 'warning.main' : 'text.disabled'}
          />
        </Grid>
      </Grid>

      <WeighingsTable
        data={items}
        isLoading={listLoading}
        isFetching={listFetching}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        materialCode={materialCode}
        onMaterialChange={(code) => { setMaterialCode(code); pagination.resetPage() }}
        materialOptions={materials}
        pagination={toPaginationProps(pagination, listData?.total ?? 0)}
        onValidate={can('weighings.review') ? handleValidate : undefined}
        onReject={can('weighings.review') ? handleOpenReject : undefined}
        onMarkPaid={can('weighings.pay') ? handleMarkPaid : undefined}
        actionLoadingId={actionLoadingId}
      />

      <RegisterWeighingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t.pesajes.rejectDialog.title}</DialogTitle>
        <DialogContent>
          <MuiTextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label={t.pesajes.rejectDialog.reasonLabel}
            placeholder={t.pesajes.rejectDialog.reasonPlaceholder}
            value={rejectReason}
            onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError('') }}
            error={!!rejectReasonError}
            helperText={rejectReasonError}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setRejectDialogOpen(false)}>{t.common.cancel}</Button>
          <Button color="error" onClick={handleConfirmReject}>{t.pesajes.rejectDialog.confirm}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
