import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Badge, Button, Select,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import { PAGE_SIZE_OPTIONS, type PaginationProps } from '../../lib/pagination'
import type { OrganizationLink } from '../../services/links'
import { LINK_STATUSES, STATUS_COLOR, formatDate, statusLabel } from './linkStatus'

interface Props {
  /** Which organization is looking: the other one is the one shown in each row. */
  side: 'eca' | 'association'
  data: OrganizationLink[]
  isLoading?: boolean
  isFetching?: boolean
  status: string
  onStatusChange: (status: string) => void
  pagination: PaginationProps
  emptyMessage: string
  /** Association only: decide a pending request. */
  onAccept?: (link: OrganizationLink) => void
  onReject?: (link: OrganizationLink) => void
  /** Either side: end an active link; the ECA also cancels its own pending request. */
  onRemove?: (link: OrganizationLink) => void
  /** The link an action is running on. */
  busyId?: string | null
}

export default function LinksTable({
  side, data, isLoading, isFetching, status, onStatusChange, pagination, emptyMessage, onAccept, onReject, onRemove, busyId,
}: Props) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.vinculaciones.countPlural : t.vinculaciones.countSingular}`
  const hasActions = Boolean(onAccept || onReject || onRemove)

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', gap: 2, flexWrap: 'wrap' }}>
        <Select
          label={t.vinculaciones.filter.label}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[{ value: '', label: t.vinculaciones.filter.all }, ...LINK_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))]}
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{countLabel}</Typography>
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">{emptyMessage}</Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{side === 'eca' ? t.vinculaciones.table.association : t.vinculaciones.table.eca}</TableCell>
                <TableCell>{t.vinculaciones.table.city}</TableCell>
                <TableCell>{t.vinculaciones.table.status}</TableCell>
                <TableCell>{t.vinculaciones.table.requested}</TableCell>
                <TableCell>{t.vinculaciones.table.decided}</TableCell>
                {hasActions && <TableCell>{t.vinculaciones.table.actions}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((link) => {
                const other = side === 'eca' ? link.association : link.eca
                const busy = busyId === link.id
                return (
                  <TableRow key={link.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{other.legal_name}</TableCell>
                    <TableCell>{other.city ?? t.vinculaciones.noCity}</TableCell>
                    <TableCell>
                      <Badge label={statusLabel(link.status)} color={STATUS_COLOR[link.status] ?? 'default'} />
                      {link.status === 'rejected' && (
                        <Typography variant="caption" color="text.secondary" component="p" mt={0.5}>
                          {t.vinculaciones.table.reason}: {link.rejection_reason ?? t.vinculaciones.noReason}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{formatDate(link.created_at)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{link.decided_at ? formatDate(link.decided_at) : t.vinculaciones.noCity}</TableCell>
                    {hasActions && (
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {link.status === 'requested' && onAccept && (
                            <Button size="small" loading={busy} disabled={!!busyId} onClick={() => onAccept(link)}>
                              {t.vinculaciones.actions.accept}
                            </Button>
                          )}
                          {link.status === 'requested' && onReject && (
                            <Button size="small" variant="outlined" color="error" disabled={!!busyId} onClick={() => onReject(link)}>
                              {t.vinculaciones.actions.reject}
                            </Button>
                          )}
                          {(link.status === 'active' || (link.status === 'requested' && side === 'eca')) && onRemove && (
                            <Button size="small" variant="outlined" color="error" loading={busy} disabled={!!busyId} onClick={() => onRemove(link)}>
                              {link.status === 'requested' ? t.vinculaciones.actions.cancel : t.vinculaciones.actions.remove}
                            </Button>
                          )}
                        </Box>
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
