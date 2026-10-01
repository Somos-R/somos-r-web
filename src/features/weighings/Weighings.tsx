import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import MuiTextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import WeighingsTable, { type Weighing, type WeighingSort } from './WeighingsTable'
import RegisterWeighingDrawer from './RegisterWeighingDrawer'
import { Card, CardContent, Button, Loader } from '../../components/ui'
import { t } from '../../lib/i18n'
import { weighingsService, type AffiliationStatus, type WeighingAPI, type WeighingSortColumn, type WeighingStatus, type WeighingStatusTransition } from '../../services/weighings'
import { periodBounds } from '../../lib/period'
import { csvFileName, saveBlob } from '../../lib/download'
import { nextSort } from '../../lib/sorting'
import { MIN_SEARCH_LENGTH } from '../../queries/recyclers'
import { weighingsQueries } from '../../queries/weighings'
import { catalogQueries } from '../../queries/catalogs'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { useRoles } from '../../hooks/useRoles'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

// A registered recycler, or an unregistered seller identified by name and document.
function whoDelivered(w: WeighingAPI): Weighing['person'] {
  if (w.recycler) return { name: w.recycler.full_name, document: w.recycler.id_number, registered: true }
  return {
    name: w.seller_name ?? t.pesajes.table.unregistered,
    document: w.seller_id_number ? `${w.seller_id_type ?? ''} ${w.seller_id_number}`.trim() : null,
    registered: false,
  }
}

function toViewModel(w: WeighingAPI): Weighing {
  return {
    id: w.id,
    occurred_at: w.occurred_at,
    person: whoDelivered(w),
    affiliation: w.affiliation_status,
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
        <Typography variant="h5" component="p" fontWeight={700} color={color} mt={0.5}>{value}</Typography>
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
  const [affiliation, setAffiliation] = useState<AffiliationStatus | ''>('')
  const [search, setSearch] = useState('')
  // The box updates on every key; the request waits for a pause in typing.
  const debouncedSearch = useDebouncedValue(search.trim())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // Newest first, as the server does when nothing is asked.
  const [sort, setSort] = useState<WeighingSort>({ column: 'occurred_at', direction: 'desc' })
  const pagination = usePagination()

  const handleSortChange = (column: WeighingSortColumn) => {
    setSort((current) => nextSort(current, column, 'occurred_at'))
    pagination.resetPage()
  }

  // The server filters and paginates; the previous page stays on screen while the next loads.
  const { data: listData, isLoading: listLoading, isFetching: listFetching } = useQuery(
    weighingsQueries.list({
      status, materialCode, affiliation, search: debouncedSearch, dateFrom, dateTo,
      sort: sort.column, order: sort.direction, page: pagination.page, rowsPerPage: pagination.rowsPerPage,
    }),
  )
  pagination.clamp(listData?.total)

  const { data: materials = [] } = useQuery(catalogQueries.materials())
  const { data: stats } = useQuery(weighingsQueries.stats())

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: WeighingStatusTransition; reason?: string }) =>
      weighingsService.updateStatus(id, { status, rejection_reason: reason }),
    // On a conflict (already validated by someone else, recycler no longer verified...) the
    // global handler shows the server's message and this reloads the row.
    meta: { refreshOnError: AFFECTED.weighingReviewed },
    onSuccess: () => invalidateAffected(queryClient, AFFECTED.weighingReviewed),
    onSettled: () => {
      setActionLoadingId(null)
    },
  })

  // The file holds every weighing matching the filters on screen, not just the visible page. A failure
  // (too many rows, no permission) is reported by the global handler.
  const exportMutation = useMutation({
    mutationFn: () =>
      weighingsService.exportCsv({
        status: status || undefined,
        material_code: materialCode || undefined,
        affiliation: affiliation || undefined,
        q: debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : undefined,
        ...periodBounds(dateFrom, dateTo),
        sort: sort.column,
        order: sort.direction,
      }),
    onSuccess: (file) => saveBlob(file, csvFileName(t.pesajes.exportFile)),
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
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><Loader /></Box>
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight={600}>{t.pesajes.title}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{t.pesajes.subtitle}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {can('weighings.view') && (
            <Button variant="outlined" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
              {exportMutation.isPending ? t.common.exportCsv.busy : t.common.exportCsv.button}
            </Button>
          )}
          {can('weighings.create') && <Button onClick={() => setDrawerOpen(true)}>{t.pesajes.newWeighing}</Button>}
        </Box>
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
        search={search}
        onSearchChange={(text) => { setSearch(text); pagination.resetPage() }}
        affiliation={affiliation}
        onAffiliationChange={(next) => { setAffiliation(next); pagination.resetPage() }}
        sort={sort}
        onSortChange={handleSortChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(day) => { setDateFrom(day); pagination.resetPage() }}
        onDateToChange={(day) => { setDateTo(day); pagination.resetPage() }}
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
