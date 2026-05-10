import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import RecyclersTable, { type Recycler } from './RecyclersTable'
import RegisterRecyclerDrawer from './RegisterRecyclerDrawer'
import { Snackbar } from '../../components/ui'
import { recyclersService } from '../../services/recyclers'
import { t } from '../../lib/i18n'

export default function Recyclers() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
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
        validatingId={validatingId}
      />

      <RegisterRecyclerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
