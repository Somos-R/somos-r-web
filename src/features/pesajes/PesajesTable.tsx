import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import {
  Input, Badge,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TablePagination,
} from '../../components/ui'

export interface Pesaje {
  id: string
  fecha: string
  reciclador_nombre: string
  material: 'papel' | 'plastico' | 'vidrio' | 'metal' | 'carton'
  kg: number
  precio_kg: number
  estado: 'pendiente' | 'validado' | 'pagado'
}

interface PesajesTableProps {
  data: Pesaje[]
  isLoading?: boolean
}

const MATERIAL_CONFIG: Record<Pesaje['material'], { label: string; color: 'default' | 'info' | 'primary' | 'success' | 'warning' | 'error' }> = {
  papel: { label: 'Papel', color: 'info' },
  plastico: { label: 'Plástico', color: 'primary' },
  vidrio: { label: 'Vidrio', color: 'success' },
  metal: { label: 'Metal', color: 'default' },
  carton: { label: 'Cartón', color: 'warning' },
}

const ESTADO_CONFIG: Record<Pesaje['estado'], { label: string; color: 'warning' | 'success' | 'info' }> = {
  pendiente: { label: 'Pendiente', color: 'warning' },
  validado: { label: 'Validado', color: 'success' },
  pagado: { label: 'Pagado', color: 'info' },
}

const PAGE_SIZE = 8

export default function PesajesTable({ data, isLoading }: PesajesTableProps) {
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

  return (
    <TableContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Input
          placeholder="Buscar por reciclador o material..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          fullWidth={false}
          sx={{ width: 280 }}
        />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} pesaje{filtered.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {filtered.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {search ? `Sin resultados para "${search}"` : 'No hay pesajes registrados aún.'}
          </Typography>
        </Box>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Reciclador</TableCell>
                <TableCell>Material</TableCell>
                <TableCell align="right">Kg</TableCell>
                <TableCell align="right">Precio/kg</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Estado</TableCell>
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
