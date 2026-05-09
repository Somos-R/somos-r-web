import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import {
  Input, Badge, Button,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'

export interface Reciclador {
  id: string
  full_name: string
  id_number: string
  phone: string | null
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
}

interface RecicladoresTableProps {
  data: Reciclador[]
  isLoading?: boolean
}

const STATUS_CONFIG: Record<Reciclador['status'], { label: string; color: 'success' | 'warning' | 'error' }> = {
  verified: { label: 'Verificado', color: 'success' },
  pending: { label: 'Pendiente', color: 'warning' },
  rejected: { label: 'Rechazado', color: 'error' },
}

const PAGE_SIZE = 8

export default function RecicladoresTable({ data, isLoading }: RecicladoresTableProps) {
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

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder="Buscar por nombre o cédula..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 280 }}
        />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} reciclador{filtered.length !== 1 ? 'es' : ''}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search ? `Sin resultados para "${search}"` : 'No hay recicladores registrados aún.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Cédula</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Registro</TableCell>
                <TableCell>Acciones</TableCell>
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
                      <Button variant="outlined" size="small">Validar</Button>
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
