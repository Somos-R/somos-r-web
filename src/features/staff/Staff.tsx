import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import StaffTable from './StaffTable'
import InviteStaffDrawer from './InviteStaffDrawer'
import DeactivateStaffDialog from './DeactivateStaffDialog'
import { Snackbar } from '../../components/ui'
import { catalogQueries } from '../../queries/catalogs'
import { staffQueries } from '../../queries/staff'
import { AFFECTED, invalidateAffected } from '../../queries/invalidation'
import { staffService, type StaffMember } from '../../services/staff'
import { t, interpolate } from '../../lib/i18n'
import { useAuth } from '../../hooks/useAuth'
import { useRoles } from '../../hooks/useRoles'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { toPaginationProps, usePagination } from '../../lib/pagination'
import { getApiErrorMessage } from '../../lib/apiError'

export default function Staff() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { can } = useRoles()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<StaffMember | null>(null)
  const [changingId, setChangingId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const pagination = usePagination()

  // The staff of an ECA is ECA staff, and of an Association is Association staff; the server only
  // returns the people of the caller's own organization.
  const userType = user?.user_type === 'association' ? 'association' : 'eca'
  const { data: response, isLoading, isFetching } = useQuery(
    staffQueries.list({ userType, search: debouncedSearch, page: pagination.page, rowsPerPage: pagination.rowsPerPage }),
  )
  pagination.clamp(response?.total)

  const { data: roles = [] } = useQuery(catalogQueries.roles())
  const roleLabels = Object.fromEntries(roles.map((role) => [role.code, role.label]))

  const resendMutation = useMutation({
    meta: { silent: true, refreshOnError: AFFECTED.staffChanged },
    mutationFn: (userId: string) => {
      setResendingId(userId)
      return staffService.resendInvitation(userId)
    },
    onSuccess: (person) => {
      invalidateAffected(queryClient, AFFECTED.staffChanged)
      setSnackbar({ open: true, message: interpolate(t.personal.resend.successMessage, { email: person.email }), severity: 'success' })
    },
    onError: (err: unknown) => {
      setSnackbar({ open: true, message: getApiErrorMessage(err, t.personal.resend.errorMessage), severity: 'error' })
    },
    onSettled: () => setResendingId(null),
  })

  // Deactivating or reactivating: the server closes the person's sessions on deactivation. On failure the
  // list reloads too (the person may already have been changed by another admin).
  const statusMutation = useMutation({
    meta: { silent: true, refreshOnError: AFFECTED.staffChanged },
    mutationFn: ({ person, active, reason }: { person: StaffMember; active: boolean; reason?: string }) => {
      setChangingId(person.id)
      return staffService.setActive(person.id, { is_active: active, reason })
    },
    onSuccess: (updated, { person, active }) => {
      invalidateAffected(queryClient, AFFECTED.staffChanged)
      setDeactivating(null)
      const message = interpolate(active ? t.personal.status_change.reactivated : t.personal.status_change.deactivated, { name: updated.full_name || person.full_name })
      setSnackbar({ open: true, message, severity: 'success' })
    },
    onError: (err: unknown) => {
      setDeactivating(null)
      setSnackbar({ open: true, message: getApiErrorMessage(err, t.personal.status_change.errorMessage), severity: 'error' })
    },
    onSettled: () => setChangingId(null),
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" component="h1" fontWeight={600}>{t.personal.title}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{t.personal.subtitle}</Typography>
      </Box>

      <StaffTable
        data={response?.items ?? []}
        isLoading={isLoading}
        isFetching={isFetching}
        search={search}
        onSearchChange={(text) => { setSearch(text); pagination.resetPage() }}
        pagination={toPaginationProps(pagination, response?.total ?? 0)}
        roleLabels={roleLabels}
        onInviteClick={can('staff.invite') ? () => setDrawerOpen(true) : undefined}
        onResend={can('staff.invite') ? (id) => resendMutation.mutate(id) : undefined}
        resendingId={resendingId}
        currentUserId={user?.id}
        onDeactivate={can('staff.manage') ? setDeactivating : undefined}
        onReactivate={can('staff.manage') ? (person) => statusMutation.mutate({ person, active: true }) : undefined}
        changingId={changingId}
      />

      {deactivating && (
        <DeactivateStaffDialog
          name={deactivating.full_name}
          busy={statusMutation.isPending}
          onClose={() => setDeactivating(null)}
          onConfirm={(reason) => statusMutation.mutate({ person: deactivating, active: false, reason })}
        />
      )}

      {can('staff.invite') && (
        <InviteStaffDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} userType={userType} />
      )}

      <Snackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Box>
  )
}
