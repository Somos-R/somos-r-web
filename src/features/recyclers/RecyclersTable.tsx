import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import MuiSelect from '@mui/material/Select'
import { UserPlus } from 'lucide-react'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'

export interface Recycler {
  id: string
  full_name: string
  id_number: string
  phone: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

export type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected'

interface RecyclersTableProps {
  /** The rows of the current page, already filtered by status by the server. */
  data: Recycler[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  pagination: PaginationProps
  onRegisterClick?: () => void
  onValidate?: (id: string) => void
  onReject?: (id: string) => void
  validatingId?: string | null
  rejectingId?: string | null
}

const STATUS_CONFIG: Record<Recycler['status'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  verified: { label: t.recicladores.status.verified, color: 'success' },
  pending:  { label: t.recicladores.status.pending,  color: 'warning' },
  rejected: { label: t.recicladores.status.rejected, color: 'error' },
}

export default function RecyclersTable({
  data,
  isLoading,
  isFetching,
  status,
  onStatusChange,
  pagination,
  onRegisterClick,
  onValidate,
  onReject,
  validatingId,
  rejectingId,
}: RecyclersTableProps) {
  const hasActions = !!(onValidate || onReject)
  // The API has no text search yet, so this only narrows the rows of the page already loaded.
  const [search, setSearch] = useState('')

  const filtered = data.filter((r) => {
    const q = search.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.id_number.includes(q)
  })

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.recicladores.countPlural : t.recicladores.countSingular}`
  const searchIsPartial = total > data.length

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <Input
            placeholder={t.recicladores.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            helperText={searchIsPartial && search ? interpolate(t.recicladores.searchPageOnly, { count: data.length }) : undefined}
            fullWidth={false}
            sx={{ width: 260 }}
          />
          <MuiSelect
            size="small"
            inputProps={{ 'aria-label': t.common.filterByStatus }}
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            sx={{ minWidth: 170, fontSize: '0.875rem' }}
          >
            <MenuItem value="all">{t.recicladores.filterStatus.all}</MenuItem>
            <MenuItem value="pending">{t.recicladores.filterStatus.pending}</MenuItem>
            <MenuItem value="verified">{t.recicladores.filterStatus.verified}</MenuItem>
            <MenuItem value="rejected">{t.recicladores.filterStatus.rejected}</MenuItem>
          </MuiSelect>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {countLabel}
          </Typography>
        </Box>
        {onRegisterClick && (
          <Button size="small" startIcon={<UserPlus size={16} />} onClick={onRegisterClick}>
            {t.recicladores.registerButton}
          </Button>
        )}
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search || status !== 'all'
              ? interpolate(t.recicladores.emptySearch, { query: search || status })
              : t.recicladores.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.recicladores.table.name}</TableCell>
                <TableCell>{t.recicladores.table.idNumber}</TableCell>
                <TableCell>{t.recicladores.table.phone}</TableCell>
                <TableCell>{t.recicladores.table.status}</TableCell>
                <TableCell>{t.recicladores.table.registration}</TableCell>
                {hasActions && <TableCell>{t.recicladores.table.actions}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{r.full_name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.id_number}</TableCell>
                  <TableCell>{r.phone ?? '—'}</TableCell>
                  <TableCell>
                    <Badge label={STATUS_CONFIG[r.status].label} color={STATUS_CONFIG[r.status].color} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  {hasActions && (
                    <TableCell>
                      {r.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {onValidate && (
                            <Button
                              variant="outlined"
                              size="small"
                              loading={validatingId === r.id}
                              disabled={!!validatingId || !!rejectingId}
                              onClick={() => onValidate(r.id)}
                            >
                              {t.common.validate}
                            </Button>
                          )}
                          {onReject && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              loading={rejectingId === r.id}
                              disabled={!!validatingId || !!rejectingId}
                              onClick={() => onReject(r.id)}
                            >
                              {t.recicladores.reject.button}
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
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
