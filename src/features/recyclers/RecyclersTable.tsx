import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { UserPlus } from 'lucide-react'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'

export interface Recycler {
  id: string
  full_name: string
  id_number: string
  phone: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

interface RecyclersTableProps {
  data: Recycler[]
  isLoading?: boolean
  onRegisterClick?: () => void
  onValidate?: (id: string) => void
  validatingId?: string | null
}

const STATUS_CONFIG: Record<Recycler['status'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  verified: { label: t.recicladores.status.verified, color: 'success' },
  pending: { label: t.recicladores.status.pending, color: 'warning' },
  rejected: { label: t.recicladores.status.rejected, color: 'error' },
}

const PAGE_SIZE = 8

export default function RecyclersTable({ data, isLoading, onRegisterClick, onValidate, validatingId }: RecyclersTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((r) => {
    const q = search.toLowerCase()
    return r.full_name.toLowerCase().includes(q) || r.id_number.includes(q)
  })

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress color="primary" />
      </Box>
    )
  }

  const countLabel = `${filtered.length} ${filtered.length !== 1 ? t.recicladores.countPlural : t.recicladores.countSingular}`

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Input
            placeholder={t.recicladores.searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            fullWidth={false}
            sx={{ width: 280 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {countLabel}
          </Typography>
        </Box>
        <Button size="small" startIcon={<UserPlus size={16} />} onClick={onRegisterClick}>
          {t.recicladores.registerButton}
        </Button>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search
              ? interpolate(t.recicladores.emptySearch, { query: search })
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
                <TableCell>{t.recicladores.table.actions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((r) => (
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
                  <TableCell>
                    {r.status === 'pending' && (
                      <Button
                        variant="outlined"
                        size="small"
                        loading={validatingId === r.id}
                        disabled={!!validatingId}
                        onClick={() => onValidate?.(r.id)}
                      >
                        {t.common.validate}
                      </Button>
                    )}
                  </TableCell>
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
