import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import {
  Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
  Loader,
} from '../../components/ui'
import { t } from '../../lib/i18n'
import type { PaginationProps } from '../../lib/pagination'
import { PAGE_SIZE_OPTIONS } from '../../lib/pagination'
import { getMaterialColor, getStatusStyle, type CatalogRef } from '../../lib/catalog'
import type { WeighingStatus } from '../../services/weighings'

export interface Weighing {
  id: string
  occurred_at: string
  reciclador_nombre: string
  material: CatalogRef
  kg: number
  price_per_kg: number
  status: WeighingStatus
  rejection_reason?: string | null
}

interface WeighingsTableProps {
  /** The rows of the current page, already filtered by the server. */
  data: Weighing[]
  isLoading?: boolean
  /** A new page or filter is loading while the previous rows are still shown. */
  isFetching?: boolean
  status: WeighingStatus | ''
  onStatusChange: (status: WeighingStatus | '') => void
  materialCode: string
  onMaterialChange: (code: string) => void
  materialOptions: CatalogRef[]
  pagination: PaginationProps
  onValidate?: (id: string) => void
  onReject?: (id: string) => void
  onMarkPaid?: (id: string) => void
  actionLoadingId?: string | null
}

const STATUS_CONFIG: Record<WeighingStatus, { label: string; color: 'warning' | 'success' | 'info' | 'error' | 'default' }> = {
  pending_validation: { label: t.pesajes.status.pending_validation, color: 'warning' },
  validated:          { label: t.pesajes.status.validated,          color: 'success' },
  paid:               { label: t.pesajes.status.paid,               color: 'info' },
  rejected:           { label: t.pesajes.status.rejected,           color: 'error' },
}

const statusStyle = (status: string) => getStatusStyle(STATUS_CONFIG, status, 'default' as const)

export default function WeighingsTable({
  data,
  isLoading,
  isFetching,
  status,
  onStatusChange,
  materialCode,
  onMaterialChange,
  materialOptions,
  pagination,
  onValidate,
  onReject,
  onMarkPaid,
  actionLoadingId,
}: WeighingsTableProps) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <Loader />
      </Box>
    )
  }

  const total = pagination.total
  const countLabel = `${total.toLocaleString('es-CO')} ${total !== 1 ? t.pesajes.countPlural : t.pesajes.countSingular}`
  const hasActions = onValidate || onReject || onMarkPaid
  const hasFilters = status !== '' || materialCode !== ''

  return (
    <TableContainer sx={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 120ms' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <TextField
          select size="small" SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t.common.filterByMaterial } }} value={materialCode}
          onChange={(e) => onMaterialChange(e.target.value)}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.pesajes.filterAllMaterials}</MenuItem>
          {materialOptions.map((m) => (
            <MenuItem key={m.code} value={m.code}>{m.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" SelectProps={{ displayEmpty: true, inputProps: { 'aria-label': t.common.filterByStatus } }} value={status}
          onChange={(e) => onStatusChange(e.target.value as WeighingStatus | '')}
          sx={{ width: 180 }}
        >
          <MenuItem value="">{t.pesajes.filterAllStatuses}</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{countLabel}</Typography>
      </Box>

      {data.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {hasFilters ? t.pesajes.emptyFiltered : t.pesajes.emptyState}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.pesajes.table.date}</TableCell>
                <TableCell>{t.pesajes.table.recycler}</TableCell>
                <TableCell>{t.pesajes.table.material}</TableCell>
                <TableCell align="right">{t.pesajes.table.kg}</TableCell>
                <TableCell align="right">{t.pesajes.table.pricePerKg}</TableCell>
                <TableCell align="right">{t.pesajes.table.total}</TableCell>
                <TableCell>{t.pesajes.table.status}</TableCell>
                {hasActions && <TableCell align="right">{t.common.actions}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(p.occurred_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{p.reciclador_nombre}</TableCell>
                  <TableCell>
                    <Badge label={p.material.label} color={getMaterialColor(p.material.code)} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{Number(p.kg).toLocaleString('es-CO')}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    ${Number(p.price_per_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    ${(Number(p.kg) * Number(p.price_per_kg)).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    {p.status === 'rejected' && p.rejection_reason ? (
                      <Tooltip title={p.rejection_reason}>
                        <span>
                          <Badge label={statusStyle(p.status).label} color={statusStyle(p.status).color} />
                        </span>
                      </Tooltip>
                    ) : (
                      <Badge label={statusStyle(p.status).label} color={statusStyle(p.status).color} />
                    )}
                  </TableCell>
                  {hasActions && (
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {p.status === 'pending_validation' && onValidate && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onValidate(p.id)}
                          >
                            {t.common.validate}
                          </Button>
                        )}
                        {p.status === 'pending_validation' && onReject && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onReject(p.id)}
                          >
                            {t.pesajes.actions.reject}
                          </Button>
                        )}
                        {p.status === 'validated' && onMarkPaid && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onMarkPaid(p.id)}
                          >
                            {t.pesajes.actions.markPaid}
                          </Button>
                        )}
                      </Box>
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
