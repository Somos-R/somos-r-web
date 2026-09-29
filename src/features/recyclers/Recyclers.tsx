import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import RecyclersTable, { type Recycler, type StatusFilter } from './RecyclersTable'
import RegisterRecyclerDrawer from './RegisterRecyclerDrawer'
import { Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '../../components/ui'
import { recyclersService } from '../../services/recyclers'
import { t } from '../../lib/i18n'
import { useRoles } from '../../hooks/useRoles'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { getApiErrorMessage } from '../../lib/apiError'

export default function Recyclers() {
  const queryClient = useQueryClient()
  const { can } = useRoles()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Validate state
  const [validatingId, setValidatingId] = useState<string | null>(null)

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState(false)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [status, setStatus] = useState<StatusFilter>('all')
  const pagination = usePagination()

  // The server filters by status and paginates; the previous page stays while the next loads.
  const { data: response, isLoading, isFetching } = useQuery({
    queryKey: ['recyclers', 'list', { status, page: pagination.page, rowsPerPage: pagination.rowsPerPage }],
    queryFn: ({ signal }) =>
      recyclersService.list(
        { verification_status: status === 'all' ? undefined : status, limit: pagination.limit, offset: pagination.offset },
        { signal },
      ),
    placeholderData: keepPreviousData,
  })
  pagination.clamp(response?.total)

  const recyclers: Recycler[] = (response?.items ?? []).map((item) => ({
    id: item.id,
    full_name: item.full_name,
    id_number: item.id_number,
    phone: item.phone,
    status: (item.verification_status ?? 'pending') as Recycler['status'],
    created_at: item.created_at,
  }))

  const validateMutation = useMutation({
    meta: { silent: true, refreshOnError: [['recyclers']] },
    mutationFn: (userId: string) => {
      setValidatingId(userId)
      return recyclersService.updateStatus(userId, { status: 'verified' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclers'] })
      setSnackbar({ open: true, message: t.recicladores.validate.successMessage, severity: 'success' })
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, t.recicladores.validate.errorMessage)
      setSnackbar({ open: true, message, severity: 'error' })
    },
    onSettled: () => setValidatingId(null),
  })

  const rejectMutation = useMutation({
    meta: { silent: true, refreshOnError: [['recyclers']] },
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) => {
      setRejectingId(userId)
      return recyclersService.updateStatus(userId, { status: 'rejected', rejection_reason: reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclers'] })
      setSnackbar({ open: true, message: t.recicladores.reject.successMessage, severity: 'success' })
      handleCloseRejectDialog()
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, t.recicladores.reject.errorMessage)
      setSnackbar({ open: true, message, severity: 'error' })
    },
    onSettled: () => setRejectingId(null),
  })

  const handleOpenRejectDialog = (id: string) => {
    setRejectTargetId(id)
    setRejectReason('')
    setRejectReasonError(false)
    setRejectDialogOpen(true)
  }

  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false)
    setRejectTargetId(null)
    setRejectReason('')
    setRejectReasonError(false)
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      setRejectReasonError(true)
      return
    }
    if (!rejectTargetId) return
    rejectMutation.mutate({ userId: rejectTargetId, reason: rejectReason.trim() })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.recicladores.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.recicladores.subtitle}</Typography>
      </Box>

      <RecyclersTable
        data={recyclers}
        isLoading={isLoading}
        isFetching={isFetching}
        status={status}
        onStatusChange={(next) => { setStatus(next); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, response?.total ?? 0)}
        onRegisterClick={can('recyclers.register') ? () => setDrawerOpen(true) : undefined}
        onValidate={can('recyclers.verify') ? (id) => validateMutation.mutate(id) : undefined}
        onReject={can('recyclers.verify') ? handleOpenRejectDialog : undefined}
        validatingId={validatingId}
        rejectingId={rejectingId}
      />

      <RegisterRecyclerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog} maxWidth="xs">
        <DialogTitle showClose onClose={handleCloseRejectDialog}>
          {t.recicladores.reject.dialogTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t.recicladores.reject.dialogMessage}
          </Typography>
          <TextField
            label={t.recicladores.reject.reasonLabel}
            placeholder={t.recicladores.reject.reasonPlaceholder}
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value)
              if (e.target.value.trim()) setRejectReasonError(false)
            }}
            multiline
            minRows={3}
            fullWidth
            size="small"
            error={rejectReasonError}
            helperText={rejectReasonError ? t.recicladores.reject.reasonRequired : undefined}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleCloseRejectDialog} disabled={rejectMutation.isPending}>
            {t.common.cancel}
          </Button>
          <Button
            color="error"
            loading={rejectMutation.isPending}
            onClick={handleConfirmReject}
          >
            {t.recicladores.reject.confirmButton}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
