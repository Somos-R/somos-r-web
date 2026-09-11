import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import RecyclersTable, { type Recycler } from './RecyclersTable'
import RegisterRecyclerDrawer from './RegisterRecyclerDrawer'
import { Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '../../components/ui'
import { recyclersService } from '../../services/recyclers'
import { t } from '../../lib/i18n'

export default function Recyclers() {
  const queryClient = useQueryClient()
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

  const { data: response, isLoading } = useQuery({
    queryKey: ['recyclers'],
    queryFn: () => recyclersService.list(),
  })

  const recyclers: Recycler[] = (response?.items ?? []).map((item) => ({
    id: item.id,
    full_name: item.full_name,
    id_number: item.id_number,
    phone: item.phone,
    status: (item.verification_status ?? 'pending') as Recycler['status'],
    created_at: item.created_at,
  }))

  const validateMutation = useMutation({
    mutationFn: (userId: string) => {
      setValidatingId(userId)
      return recyclersService.updateStatus(userId, { status: 'verified' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclers'] })
      setSnackbar({ open: true, message: t.recicladores.validate.successMessage, severity: 'success' })
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const message = axiosErr?.response?.data?.detail ?? t.recicladores.validate.errorMessage
      setSnackbar({ open: true, message, severity: 'error' })
    },
    onSettled: () => setValidatingId(null),
  })

  const rejectMutation = useMutation({
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
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const message = axiosErr?.response?.data?.detail ?? t.recicladores.reject.errorMessage
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
        <Typography variant="h5" fontWeight={600}>{t.recicladores.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.recicladores.subtitle}</Typography>
      </Box>

      <RecyclersTable
        data={recyclers}
        isLoading={isLoading}
        onRegisterClick={() => setDrawerOpen(true)}
        onValidate={(id) => validateMutation.mutate(id)}
        onReject={handleOpenRejectDialog}
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
