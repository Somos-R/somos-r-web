import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import {
  Input, Badge,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'
import { t, interpolate } from '../../lib/i18n'

export interface Weighing {
  id: string
  fecha: string
  reciclador_nombre: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton'
  kg: number
  precio_kg: number
  estado: 'pendiente' | 'validado' | 'pagado'
}

interface WeighingsTableProps {
  data: Weighing[]
  isLoading?: boolean
}

const MATERIAL_CONFIG: Record<Weighing['material'], { label: string; color: 'default' | 'info' | 'primary' | 'success' | 'warning' | 'error' }> = {
  papel: { label: t.pesajes.materials.papel, color: 'info' },
  plastico: { label: t.pesajes.materials.plastico, color: 'primary' },
  vidrio: { label: t.pesajes.materials.vidrio, color: 'success' },
  metal: { label: t.pesajes.materials.metal, color: 'default' },
  carton: { label: t.pesajes.materials.carton, color: 'warning' },
}

const ESTADO_CONFIG: Record<Weighing['estado'], { label: string; color: 'warning' | 'success' | 'info' }> = {
  pendiente: { label: t.pesajes.status.pendiente, color: 'warning' },
  validado: { label: t.pesajes.status.validado, color: 'success' },
  pagado: { label: t.pesajes.status.pagado, color: 'info' },
}

const PAGE_SIZE = 8

export default function WeighingsTable({ data, isLoading }: WeighingsTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE)

  const filtered = data.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.reciclador_nombre.toLowerCase().includes(q) ||
      MATERIAL_CONFIG[p.material].label.toLowerCase().includes(q)
    )
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

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder={t.pesajes.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 280 }}
        />
        <Typography variant="caption" color="text.secondary">{countLabel}</Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search
              ? interpolate(t.pesajes.emptySearch, { query: search })
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
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    {new Date(p.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{p.reciclador_nombre}</TableCell>
                  <TableCell>
                    <Badge label={MATERIAL_CONFIG[p.material].label} color={MATERIAL_CONFIG[p.material].color} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.kg}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                    ${p.precio_kg.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    ${(p.kg * p.precio_kg).toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <Badge label={ESTADO_CONFIG[p.estado].label} color={ESTADO_CONFIG[p.estado].color} />
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
