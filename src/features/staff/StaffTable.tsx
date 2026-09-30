import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { UserPlus } from 'lucide-react'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { StaffMember } from '../../services/staff'

interface StaffTableProps {
  data: StaffMember[]
  isLoading?: boolean
  isFetching?: boolean
  search: string
  onSearchChange: (text: string) => void
  pagination: PaginationProps
  /** Shown as a label next to each person's role code (from the roles catalog). */
  roleLabels: Record<string, string>
  onInviteClick?: () => void
  onResend?: (id: string) => void
  resendingId?: string | null
}

type StatusKey = 'active' | 'pending_activation' | 'inactive'

const STATUS_COLOR: Record<StatusKey, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending_activation: 'warning',
  inactive: 'error',
}

const statusOf = (person: StaffMember): StatusKey =>
  person.pending_activation ? 'pending_activation' : person.is_active === false ? 'inactive' : 'active'

export default function StaffTable({
  data,
  isLoading,
  isFetching,
  search,
  onSearchChange,
  pagination,
  roleLabels,
  onInviteClick,
  onResend,
  resendingId,
}: StaffTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.personal.countPlural : t.personal.countSingular}`

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Input
            placeholder={t.personal.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            fullWidth={false}
            sx={{ width: 300 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {countLabel}
          </Typography>
        </Box>
        {onInviteClick && (
          <Button size="small" startIcon={<UserPlus size={16} />} onClick={onInviteClick}>
            {t.personal.inviteButton}
          </Button>
        )}
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search.trim() ? interpolate(t.personal.emptySearch, { query: search.trim() }) : t.personal.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.personal.table.name}</TableCell>
                <TableCell>{t.personal.table.email}</TableCell>
                <TableCell>{t.personal.table.idNumber}</TableCell>
                <TableCell>{t.personal.table.role}</TableCell>
                <TableCell>{t.personal.table.status}</TableCell>
                {onResend && <TableCell>{t.personal.table.actions}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((person) => {
                const status = statusOf(person)
                return (
                  <TableRow key={person.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{person.full_name}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{person.id_number}</TableCell>
                    <TableCell>{(person.role_code && roleLabels[person.role_code]) || person.role_code || '—'}</TableCell>
                    <TableCell>
                      <Badge label={t.personal.status[status]} color={STATUS_COLOR[status]} />
                    </TableCell>
                    {onResend && (
                      <TableCell>
                        {status === 'pending_activation' && (
                          <Button
                            variant="outlined"
                            size="small"
                            loading={resendingId === person.id}
                            disabled={!!resendingId}
                            onClick={() => onResend(person.id)}
                          >
                            {t.personal.resend.button}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <TablePagination
            count={pagination.total}
            page={pagination.page}
            rowsPerPage={pagination.rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            onPageChange={(_, page) => pagination.onPageChange(page)}
            onRowsPerPageChange={(e) => pagination.onRowsPerPageChange(+e.target.value)}
          />
        </>
      )}
    </TableContainer>
  )
}
