import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'
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
  data: Weighing[]
  isLoading?: boolean
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

type StatusFilter = '' | WeighingStatus

const PAGE_SIZE = 8

export default function WeighingsTable({
  data,
  isLoading,
  onValidate,
  onReject,
  onMarkPaid,
  actionLoadingId,
}: WeighingsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((p) => {
    const q = search.toLowerCase()
    const matchesSearch =
      p.reciclador_nombre.toLowerCase().includes(q) ||
      p.material.label.toLowerCase().includes(q)
    const matchesStatus = statusFilter === '' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  const countLabel = `${filtered.length} ${filtered.length !== 1 ? t.pesajes.countPlural : t.pesajes.countSingular}`
  const hasActions = onValidate || onReject || onMarkPaid

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder={t.pesajes.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 280 }}
        />
        <TextField
          select size="small" value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(0) }}
          sx={{ width: 160 }}
        >
          <MenuItem value="">Todos los estados</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{countLabel}</Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search || statusFilter
              ? interpolate(t.pesajes.emptySearch, { query: search || statusFilter })
              : t.pesajes.emptyState}
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
                {hasActions && <TableCell align="right">Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((p) => (
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
                            Validar
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
                            Rechazar
                          </Button>
                        )}
                        {p.status === 'validated' && onMarkPaid && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={actionLoadingId === p.id}
                            onClick={() => onMarkPaid(p.id)}
                          >
                            Marcar pagado
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
            count={filtered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
          />
        </>
      )}
    </TableContainer>
  )
}
